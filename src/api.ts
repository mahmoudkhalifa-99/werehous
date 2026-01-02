// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ في الاتصال بالخادم');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ==================== المنتجات ====================
  
  async getProducts() {
    return this.request('/products');
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(product: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== المخازن ====================
  
  async getWarehouses() {
    return this.request('/warehouses');
  }

  async getWarehouse(id: string) {
    return this.request(`/warehouses/${id}`);
  }

  async createWarehouse(warehouse: any) {
    return this.request('/warehouses', {
      method: 'POST',
      body: JSON.stringify(warehouse),
    });
  }

  async updateWarehouse(id: string, warehouse: any) {
    return this.request(`/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(warehouse),
    });
  }

  async deleteWarehouse(id: string) {
    return this.request(`/warehouses/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== المخزون ====================
  
  async getInventory() {
    return this.request('/inventory');
  }

  async getWarehouseInventory(warehouseId: string) {
    return this.request(`/inventory/warehouse/${warehouseId}`);
  }

  async getInventoryItem(warehouseId: string, productId: string) {
    return this.request(`/inventory/${warehouseId}/${productId}`);
  }

  async updateInventory(warehouseId: string, productId: string, quantity: number) {
    return this.request(`/inventory/${warehouseId}/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async addInventory(data: { warehouse_id: string; product_id: string; quantity: number }) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== حركات المخزون ====================
  
  async getStockMovements() {
    return this.request('/stock-movements');
  }

  async createStockMovement(movement: {
    warehouse_id: string;
    product_id: string;
    movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
    quantity: number;
    user_id: string;
    reference_number?: string;
    notes?: string;
  }) {
    return this.request('/stock-movements', {
      method: 'POST',
      body: JSON.stringify(movement),
    });
  }

  // ==================== الفئات ====================
  
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(category: { name: string; description?: string }) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  // ==================== المستخدمين ====================
  
  async getUsers() {
    return this.request('/users');
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(user: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== التقارير ====================
  
  async getLowStockReport() {
    return this.request('/reports/low-stock');
  }

  async getInventoryValueReport() {
    return this.request('/reports/inventory-value');
  }

  async getMovementsReport(params?: {
    start_date?: string;
    end_date?: string;
    warehouse_id?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/reports/movements${query ? '?' + query : ''}`);
  }

  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // ==================== اختبار الاتصال ====================
  
  async testConnection() {
    return this.request('/test-db');
  }
}

export const api = new ApiService();
export default api;