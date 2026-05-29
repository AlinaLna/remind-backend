const { db } = require("../configs/firebase");
const bcrypt = require("bcryptjs");

const COLLECTION_NAME = "users";

class UserModel {
  /**
   * Mã hóa mật khẩu sử dụng bcryptjs.
   * @param {string} password - Mật khẩu dạng thô (plain text).
   * @returns {Promise<string>} - Mật khẩu đã được mã hóa (hashed password).
   */
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Kiểm tra mật khẩu thô có khớp với mật khẩu đã mã hóa không.
   * @param {string} plainPassword - Mật khẩu dạng thô.
   * @param {string} hashedPassword - Mật khẩu đã được mã hóa từ DB.
   * @returns {Promise<boolean>}
   */
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Tạo một tài khoản người dùng mới và lưu vào Firestore.
   * @param {Object} userData - Thông tin người dùng (email, password, displayName, v.v.).
   * @returns {Promise<Object>} - Đối tượng người dùng đã tạo (không bao gồm mật khẩu thô).
   */
  static async createUser(userData) {
    const { email, password, displayName } = userData;

    if (!email || !password) {
      throw new Error("Email và mật khẩu là bắt buộc.");
    }

    // Kiểm tra xem email đã tồn tại chưa
    const userSnapshot = await db.collection(COLLECTION_NAME).where("email", "==", email).get();
    if (!userSnapshot.empty) {
      throw new Error("Email đã được đăng ký.");
    }

    // Mã hóa mật khẩu (Password hashing)
    const hashedPassword = await this.hashPassword(password);

    const newUser = {
      email,
      password: hashedPassword,
      displayName: displayName || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Lưu vào Firestore (Firestore store)
    const docRef = await db.collection(COLLECTION_NAME).add(newUser);
    
    // Trả về dữ liệu không chứa password
    const { password: _, ...userWithoutPassword } = newUser;
    return { id: docRef.id, ...userWithoutPassword };
  }

  /**
   * Lấy thông tin người dùng theo ID.
   * @param {string} userId - ID của document trong Firestore.
   * @returns {Promise<Object|null>}
   */
  static async getUserById(userId) {
    const doc = await db.collection(COLLECTION_NAME).doc(userId).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    const { password: _, ...userWithoutPassword } = data;
    return { id: doc.id, ...userWithoutPassword };
  }

  /**
   * Lấy thông tin đầy đủ của người dùng theo ID (bao gồm cả mật khẩu để phục vụ xác thực).
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  static async getUserWithPasswordById(userId) {
    const doc = await db.collection(COLLECTION_NAME).doc(userId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Lấy thông tin người dùng theo Email.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  static async getUserByEmail(email) {
    const snapshot = await db.collection(COLLECTION_NAME).where("email", "==", email).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Cập nhật thông tin người dùng.
   * @param {string} userId - ID của user cần cập nhật.
   * @param {Object} updateData - Dữ liệu cần cập nhật (displayName, password, v.v.).
   * @returns {Promise<Object>} - Đối tượng người dùng sau khi cập nhật.
   */
  static async updateUser(userId, updateData) {
    const userRef = db.collection(COLLECTION_NAME).doc(userId);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      throw new Error("Người dùng không tồn tại.");
    }

    const dataToUpdate = { ...updateData };
    dataToUpdate.updatedAt = new Date().toISOString();

    // Nếu cập nhật mật khẩu, tiến hành mã hóa mật khẩu mới (Password hashing)
    if (dataToUpdate.password) {
      dataToUpdate.password = await this.hashPassword(dataToUpdate.password);
    }

    await userRef.update(dataToUpdate);

    // Lấy lại dữ liệu sau khi cập nhật
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    const { password: _, ...userWithoutPassword } = updatedData;
    
    return { id: userId, ...userWithoutPassword };
  }

  /**
   * Xóa người dùng khỏi Firestore.
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  static async deleteUser(userId) {
    const userRef = db.collection(COLLECTION_NAME).doc(userId);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      throw new Error("Người dùng không tồn tại.");
    }

    await userRef.delete();
    return true;
  }
}

module.exports = UserModel;
