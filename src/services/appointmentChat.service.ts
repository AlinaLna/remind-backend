import mongoose from 'mongoose';
import type { Server as SocketIOServer } from 'socket.io';
import ChatRoom from '../models/chatRoom.model';
import ChatMessage from '../models/chatMessage.model';
import User from '../models/user.model';

// ponytail: creates the 1-1 chat room linking a booked appointment's student + expert.
// Idempotent: returns existing active room if one already exists for that appointment.
export const ensureAppointmentChatRoom = async (
  appointmentId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  expertId: mongoose.Types.ObjectId,
  io?: SocketIOServer
): Promise<void> => {
  const existing = await ChatRoom.findOne({
    type: 'direct',
    appointmentId,
    status: 'active',
  }).lean();
  if (existing) return;

  const [student, expert] = await Promise.all([
    User.findById(studentId).select('role').lean(),
    User.findById(expertId).select('role').lean(),
  ]);
  if (!student || !expert) return;

  const room = await ChatRoom.create({
    type: 'direct',
    appointmentId,
    createdBy: studentId,
    participants: [
      { userId: studentId, role: student.role, status: 'active', joinedAt: new Date() },
      { userId: expertId, role: expert.role, status: 'active', joinedAt: new Date() },
    ],
  });

  const systemMsg = await ChatMessage.create({
    chatRoomId: room._id,
    senderId: studentId,
    senderRole: 'system',
    messageType: 'system',
    text: 'Consultation chat started. You can message each other here.',
  });

  io?.to(`chat:${room._id.toString()}`).emit('chat:message', systemMsg.toObject());
};
