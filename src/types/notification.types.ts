export interface CreateNotificationInput {
  userId: string;
  senderId?: string;
  title: string;
  message: string;
  link?: string;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  senderId: string | null;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
  sender?: {
    id: string | null;
    username: string | null;
    fullname: string | null;
    role: string;
  } | null;
}
