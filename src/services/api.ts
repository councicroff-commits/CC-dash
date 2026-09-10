// Define types matching the backend response
export interface DashboardOrder {
  _id: string;
  user_id: string;
  items: any[];
  total_amount: number;
  shipping_address: any;
  status: string;
  payment_method: string;
  created_at: string;
}

const API_BASE_URL = 'http://localhost:8000/api/v1/orders';

export const orderApi = {
  // Matches Route 2: GET /
  getAllOrders: async (): Promise<DashboardOrder[]> => {
    const response = await fetch(`${API_BASE_URL}/`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  // Matches Route 4: PUT /{order_id}/status
  updateOrderStatus: async (orderId: string, newStatus: string) => {
    const response = await fetch(`${API_BASE_URL}/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) throw new Error('Failed to update status');
    return response.json();
  },

  // Matches Route 5: DELETE /{order_id}
  deleteOrder: async (orderId: string) => {
    const response = await fetch(`${API_BASE_URL}/${orderId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete order');
    return response.json();
  }
};
