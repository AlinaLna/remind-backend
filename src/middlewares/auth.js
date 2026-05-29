const { auth } = require("../configs/firebase");

/**
 * Middleware xác thực người dùng bằng Firebase ID Token
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Không tìm thấy token xác thực. Truy cập bị từ chối.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Xác thực ID Token được gửi từ client
    const decodedToken = await auth.verifyIdToken(token);
    
    // Đính kèm thông tin user được giải mã vào request object
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Xác thực token thất bại:", error.message);
    return res.status(403).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }
};

module.exports = verifyToken;
