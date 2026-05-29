const UserModel = require("../models/user");

/**
 * Đăng ký tài khoản người dùng mới (Register User).
 */
exports.register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc." });
    }

    const newUser = await UserModel.createUser({ email, password, displayName });
    return res.status(201).json({
      message: "Đăng ký tài khoản thành công.",
      user: newUser,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/**
 * Đăng nhập người dùng (Login User).
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc." });
    }

    // Tìm user theo email
    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác." });
    }

    // So khớp mật khẩu đã được mã hóa (Compare hashed password)
    const isMatch = await UserModel.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác." });
    }

    // Loại bỏ mật khẩu trước khi trả về client
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({
      message: "Đăng nhập thành công.",
      user: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy chi tiết thông tin một người dùng (Get User Profile).
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng." });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Cập nhật thông tin người dùng (Update User).
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, password } = req.body;

    // Chỉ cho phép update các trường được phép thay đổi
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (password !== undefined) updateData.password = password;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu nào được cung cấp để cập nhật." });
    }

    const updatedUser = await UserModel.updateUser(id, updateData);
    return res.status(200).json({
      message: "Cập nhật thông tin thành công.",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/**
 * Xóa người dùng (Delete User).
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await UserModel.deleteUser(id);
    return res.status(200).json({ message: "Xóa người dùng thành công." });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
