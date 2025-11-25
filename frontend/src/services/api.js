const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

// Helper function to get auth token
const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem('nengoo-user') || '{}');
  return user.token || '';
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && options.auth !== false) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Une erreur est survenue');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ==================== AUTH APIs ====================

export const registerBuyer = async (buyerData) => {
  return apiCall('/auth/register/buyer', {
    method: 'POST',
    body: JSON.stringify(buyerData),
    auth: false,
  });
};

export const registerSeller = async (sellerData) => {
  return apiCall('/auth/register/seller', {
    method: 'POST',
    body: JSON.stringify(sellerData),
    auth: false,
  });
};

export const login = async (whatsapp, password, userType) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ whatsapp, password, userType }),
    auth: false,
  });
};

export const adminLogin = async (username, password) => {
  return apiCall('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    auth: false,
  });
};

export const getCurrentUser = async () => {
  return apiCall('/me');
};

// ==================== ADMIN APIs ====================

export const getPendingSellers = async () => {
  return apiCall('/admin/sellers/pending');
};

export const getAllSellers = async () => {
  return apiCall('/admin/sellers');
};

export const approveSeller = async (sellerId) => {
  return apiCall(`/admin/sellers/${sellerId}/approve`, {
    method: 'PUT',
  });
};

export const rejectSeller = async (sellerId) => {
  return apiCall(`/admin/sellers/${sellerId}/reject`, {
    method: 'PUT',
  });
};

export const deleteSeller = async (sellerId) => {
  return apiCall(`/admin/sellers/${sellerId}`, {
    method: 'DELETE',
  });
};

export const createSellerByAdmin = async (sellerData) => {
  return apiCall('/admin/sellers', {
    method: 'POST',
    body: JSON.stringify(sellerData),
  });
};

export const updateSellerByAdmin = async (sellerId, sellerData) => {
  return apiCall(`/admin/sellers/${sellerId}`, {
    method: 'PUT',
    body: JSON.stringify(sellerData),
  });
};

export const updateSellerPasswordByAdmin = async (sellerId, password) => {
  return apiCall(`/admin/sellers/${sellerId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
};

export const getAllBuyers = async () => {
  return apiCall('/admin/buyers');
};

export const deleteBuyer = async (buyerId) => {
  return apiCall(`/admin/buyers/${buyerId}`, {
    method: 'DELETE',
  });
};

export const updateBuyerByAdmin = async (buyerId, buyerData) => {
  return apiCall(`/admin/buyers/${buyerId}`, {
    method: 'PUT',
    body: JSON.stringify(buyerData),
  });
};

export const updateBuyerPasswordByAdmin = async (buyerId, password) => {
  return apiCall(`/admin/buyers/${buyerId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
};

export const createAdmin = async (adminData) => {
  return apiCall('/admin/create', {
    method: 'POST',
    body: JSON.stringify(adminData),
  });
};

export const initSystemSeller = async () => {
  return apiCall('/admin/init-system-seller', {
    method: 'POST',
  });
};

// ==================== CATEGORIES APIs ====================

export const getAllCategories = async () => {
  return apiCall('/admin/categories');
};

export const createCategory = async (categoryData) => {
  return apiCall('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
};

export const updateCategory = async (categoryId, categoryData) => {
  return apiCall(`/admin/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
};

export const deleteCategory = async (categoryId) => {
  return apiCall(`/admin/categories/${categoryId}`, {
    method: 'DELETE',
  });
};

// ==================== PRODUCTS APIs ====================

export const getAllProducts = async () => {
  return apiCall('/admin/products');
};

export const createProduct = async (productData) => {
  return apiCall('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
};

export const updateProduct = async (productId, productData) => {
  return apiCall(`/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

export const deleteProduct = async (productId) => {
  return apiCall(`/admin/products/${productId}`, {
    method: 'DELETE',
  });
};

// ==================== ORDERS APIs ====================

export const getAllOrders = async () => {
  return apiCall('/admin/orders');
};

export const updateOrderStatus = async (orderId, statusData) => {
  return apiCall(`/admin/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(statusData),
  });
};

// ==================== SELLER PRODUCTS APIs ====================

export const getSellerOwnProducts = async () => {
  return apiCall('/seller/products');
};

export const createProductBySeller = async (productData) => {
  return apiCall('/seller/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
};

export const updateSellerProduct = async (productId, productData) => {
  return apiCall(`/seller/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

export const deleteSellerProduct = async (productId) => {
  return apiCall(`/seller/products/${productId}`, {
    method: 'DELETE',
  });
};

export const getSellerOrders = async () => {
  return apiCall('/seller/orders');
};

export const deleteSellerOrder = async (orderId) => {
  console.log('deleteSellerOrder API function called with orderId:', orderId);
  console.log('Making DELETE request to:', `/seller/orders/${orderId}`);
  return apiCall(`/seller/orders/${orderId}`, {
    method: 'DELETE',
  });
};

// ==================== PUBLIC APIs (No Auth Required) ====================

export const getPublicCategories = async () => {
  return apiCall('/categories', { auth: false });
};

export const getPublicProducts = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.sellerId) params.append('seller_id', filters.sellerId);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);

  const queryString = params.toString();
  const endpoint = queryString ? `/products?${queryString}` : '/products';

  return apiCall(endpoint, { auth: false });
};

export const getPublicProduct = async (productId) => {
  return apiCall(`/products/${productId}`, { auth: false });
};

export const getSellerProducts = async (sellerId) => {
  return apiCall(`/sellers/${sellerId}/products`, { auth: false });
};

// ==================== MESSAGES APIs ====================

export const createMessage = async (messageData) => {
  return apiCall('/messages', {
    method: 'POST',
    body: JSON.stringify(messageData),
  });
};

export const getSellerMessages = async () => {
  return apiCall('/seller/messages');
};

export const getBuyerMessages = async () => {
  return apiCall('/buyer/messages');
};

export const markMessageAsRead = async (messageId) => {
  return apiCall(`/messages/${messageId}/read`, {
    method: 'PUT',
  });
};

export const replyToMessage = async (messageId, replyData) => {
  return apiCall(`/messages/${messageId}/reply`, {
    method: 'POST',
    body: JSON.stringify(replyData),
  });
};

// ==================== PROFILE APIs ====================

export const updateSellerProfile = async (profileData) => {
  return apiCall('/seller/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const updateBuyerProfile = async (profileData) => {
  return apiCall('/buyer/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// ==================== UPLOAD APIs ====================

export const uploadProductImage = async (file) => {
  const url = `${API_BASE_URL}/upload/product-image`;
  const token = getAuthToken();

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Erreur lors de l\'upload de l\'image');
    }

    return data;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
};

export const deleteProductImage = async (filename) => {
  return apiCall(`/upload/product-image/${filename}`, {
    method: 'DELETE',
  });
};

export default {
  registerBuyer,
  registerSeller,
  login,
  adminLogin,
  getCurrentUser,
  getPendingSellers,
  getAllSellers,
  approveSeller,
  rejectSeller,
  deleteSeller,
  createSellerByAdmin,
  getAllBuyers,
  deleteBuyer,
  createAdmin,
  initSystemSeller,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  uploadProductImage,
  deleteProductImage,
  getSellerOwnProducts,
  createProductBySeller,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerOrders,
  getPublicCategories,
  getPublicProducts,
  getPublicProduct,
  getSellerProducts,
  createMessage,
  getSellerMessages,
  getBuyerMessages,
  markMessageAsRead,
  replyToMessage,
  updateSellerProfile,
  updateBuyerProfile,
};
