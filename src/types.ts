export type UserRole = 'user' | 'admin';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
}

export interface Service {
  id: string;
  category: string;
  name: string;
  pricePer1000: number;
}

export interface Order {
  id: string;
  userId: string;
  category: string;
  link: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'processing' | 'completed';
  createdAt: any;
}
