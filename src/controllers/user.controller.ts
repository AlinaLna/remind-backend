import type { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';
import { uploadToCloudinary } from '../services/cloudinary.service';

// Helper build safe user response
const buildUserResponse = (user: any) => ({
  id: user._id.toString(),
  email: user.email,
  fullName: user.fullName || '',
  role: user.role,
  status: user.status,
  avatar: user.avatar || '',
  isAnonymous: !!user.isAnonymous,
  createdAt: user.createdAt,
});

/**
 * Lấy thông tin cá nhân hiện tại
 */
export const getProfile: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    return res.status(200).json({ user: buildUserResponse(user) });
  } catch (error) {
    console.error('Lấy thông tin cá nhân thất bại:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * Cập nhật thông tin cá nhân (họ tên, trạng thái ẩn danh)
 */
export const updateProfile: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }

    const { fullName, isAnonymous } = req.body;
    const updateData: any = {};

    if (fullName !== undefined) {
      updateData.fullName = String(fullName).trim();
    }
    if (isAnonymous !== undefined) {
      updateData.isAnonymous = Boolean(isAnonymous);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    return res.status(200).json({ user: buildUserResponse(user) });
  } catch (error) {
    console.error('Cập nhật thông tin cá nhân thất bại:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * Thay đổi mật khẩu tài khoản
 */
export const changePassword: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user || !user.password) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Thay đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Đổi mật khẩu thất bại:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * Tải lên ảnh đại diện (avatar)
 */
export const uploadAvatar: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng cung cấp file ảnh đại diện' });
    }

    const imageUrl = await uploadToCloudinary(req.file.buffer, 'avatars');

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatar: imageUrl } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    return res.status(200).json({
      message: 'Tải lên ảnh đại diện thành công',
      avatar: imageUrl,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Tải lên ảnh đại diện thất bại:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
};
