
export type Role = 'admin' | 'cashier' | 'supervisor' | string;

export type PermissionLevel = 'edit' | 'available' | 'hidden';

export interface UserPermissions {
    screens: {
        // القائمة الجانبية والشاشة الرئيسية
        sb_home?: PermissionLevel;
        sb_purchases?: PermissionLevel;
        sb_sales?: PermissionLevel;
        sb_finished?: PermissionLevel;
        sb_raw?: PermissionLevel;
        sb_general?: PermissionLevel;
        sb_monthly_reports?: PermissionLevel;
        sb_settings?: PermissionLevel;
        sb_expenses?: PermissionLevel;
        m_dashboard?: PermissionLevel;
        [key: string]: PermissionLevel | undefined;
    };
    features: {
        // شاشة المبيعات
        new_sale?: PermissionLevel;
        edit_invoice?: PermissionLevel;
        invoice_log?: PermissionLevel;
        logistics_pulse?: PermissionLevel;
        reports_panel?: PermissionLevel;
        // شاشة المشتريات
        new_purchase?: PermissionLevel;
        purchase_log?: PermissionLevel;
        receive_supply?: PermissionLevel;
        purchase_reports?: PermissionLevel;
        purchase_return?: PermissionLevel;
        // مخزن المنتج التام
        f_balances?: PermissionLevel;
        f_prod_receipt?: PermissionLevel;
        f_settlements?: PermissionLevel;
        f_returns?: PermissionLevel;
        f_opening_stock?: PermissionLevel;
        // مخزن الخامات
        r_raw_in?: PermissionLevel;
        r_silo_trans?: PermissionLevel;
        r_control_out?: PermissionLevel;
        r_shortage?: PermissionLevel;
        r_composite_balances?: PermissionLevel;
        // المخازن العامة
        g_parts?: PermissionLevel;
        g_catering?: PermissionLevel;
        g_custody?: PermissionLevel;
        [key: string]: PermissionLevel | undefined;
    };
    actions: {
        canImport: boolean;
        canExport: boolean;
        canDelete: boolean;
        canEditSettings: boolean;
        canManageCloudLists: boolean;
    };
}

export interface SystemUser {
  id: string;
  username: string;
  role: Role;
  name: string;
  email?: string;
  jobTitle?: string;
  password?: string;
  permissions?: UserPermissions;
  lastActive?: string;
}

export type WarehouseType = 'finished' | 'parts' | 'raw' | 'catering';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  jdeCode?: string;
  jdeCodeBulk?: string;
  jdeCodePacked?: string;
  price: number;
  cost: number;
  stock: number;
  stockBulk?: number;
  stockPacked?: number;
  initialStockBulk?: number; 
  initialStockPacked?: number; 
  category: string;
  image?: string;
  warehouse: WarehouseType;
  unit?: string;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number; 
  sackWeight?: number;
  supplierId?: string;
  customFields?: Record<string, string>;
  goodsGroup?: string; 
  housingOfficer?: string;
  notes?: string;
}

export interface CartItem extends Product {
  quantity: number;
  discount: number;
  productionDate?: string;
  salesType?: string;
  quantityPacked?: number;
  quantityBulk?: number;
  returnReason?: string;
  soQuantity?: number; 
  itemVariance?: number; 
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  productCode: string;
  jdeCode?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
  receivedQuantity?: number;
}

export interface Purchase {
  id: string;
  orderNumber: string;
  date: string;
  createdAt?: string;
  department?: string;
  section?: string; 
  warehouseName?: string; 
  storekeeper?: string; 
  requestType?: string;
  supplyOrderNumber?: string;
  compositeCode?: string;
  jdeCode?: string;
  affiliatedEntity?: string;
  requester?: string;
  requestFor?: string;
  executionEntity?: string;
  stockStatus?: string;
  requiredDeliveryDate?: string;
  supplier: string;
  supplierCode?: string;
  warehouse: WarehouseType;
  status: 'pending' | 'received' | 'cancelled';
  items: PurchaseItem[];
  total: number;
  notes?: string;
  paymentMethod?: string;
  deliveryDays?: number;
  supplierInvoice?: string;
  receivedDate?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return';
  warehouse: WarehouseType;
  refNumber?: string;
  supplyNumber?: string; 
  items: { 
      productId: string; 
      productName: string; 
      productCode?: string;
      jdeCode?: string;
      itemStatus?: string;
      quantity: number;
      quantityBulk?: number;
      quantityPacked?: number;
      shift?: string;
      productionDate?: string;
      notes?: string;
      storekeeper?: string;
      unit?: string;
      inspectingOfficer?: string; 
      inspectionReportNo?: string; 
      safetyInspector?: string; 
      qualityInspector?: string; 
      responsiblePurchase?: string; 
      housingOfficer?: string; 
      goodsGroup?: string; 
      recipientName?: string; 
      department?: string; 
      affiliatedEntity?: string; 
      purchaseOrderNo?: string; 
      supplierName?: string; 
      receiverWarehouse?: string; 
      settlementReason?: string; 
      entryTime?: string; 
      exitTime?: string; 
      currentBalance?: number; 
      warehouseSource?: string;
      section?: string;
      employeeCode?: string;
      workOrderNo?: string;
      equipmentCode?: string;
      issueStatus?: string;
      oldPartsStatus?: string;
      meterReading?: string;
      timeDiff?: string;
      destination?: string; 
      issueType?: string; 
  }[];
  reason?: string;
  user: string;
  customFields?: Record<string, string>;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  payee: string;
  description?: string;
  user: string;
}

export interface SequenceConfig {
  invoice: number;
  purchaseOrder: number;
  issueVoucher: number;
  receiveVoucher: number;
  purchaseRequest: number;
}

export interface PrintConfig {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  logoLeft: string;
  showLogo: boolean;
  showCompanyInfo: boolean;
  reportTitle?: string;
  reportTitleAlignment?: 'left' | 'center' | 'right';
  headerColor?: string;
  titleColor?: string;
  fontSize?: number;
  footerText?: string;
  watermark?: {
    enabled: boolean;
    type: 'text' | 'image';
    text?: string;
    image?: string;
    opacity: number;
    rotation: number;
    fontSize: number;
    color: string;
  };
}

export interface Sale {
  id: string;
  date: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  customer?: string;
  customerCode?: string;
  customerAddress?: string;
  shift?: string;
  salesOrderNumber?: string;
  salesOrderQuantity?: number;
  ticketNumber?: string;
  transportMethod?: string;
  contractorName?: string;
  carType?: string;
  carNumber?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  entranceTime?: string;
  exitTime?: string;
  loadingDuration?: string;
  driverName?: string;
  loadingOfficer?: string;
  confirmationOfficer?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  variance?: number;
  paymentMethod: 'cash' | 'card' | string;
  isClosed?: boolean;
  isReturn?: boolean;
  notes?: string;
  manualInvoiceNo?: string;
  paperVoucher?: string;
}

export interface ButtonConfig {
  id: string;
  labelKey: string;
  labelAr?: string;
  labelEn?: string;
  icon: string;
  color: string;
  action: string;
  isVisible: boolean;
  roles?: Role[];
}

export interface ScreenConfig {
  id: string;
  name: string;
  buttons: ButtonConfig[];
}

export interface UiConfig {
  sidebar: ScreenConfig;
  main: ScreenConfig;
  sales: ScreenConfig;
  monthly_reports: ScreenConfig;
  purchases: ScreenConfig;
  finished: ScreenConfig;
  raw: ScreenConfig;
  general: ScreenConfig;
  reports: ScreenConfig;
  settings: ScreenConfig;
  parts_warehouse: ScreenConfig;
  catering_warehouse: ScreenConfig;
}

export interface PurchaseRequest {
  id: string;
  date: string;
  requester: string;
  warehouse: string;
  item: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
}

export type DataSourceType = 'sales' | 'purchases' | 'products' | 'movements' | 'purchaseRequests' | 'users' | 'expenses';

export interface ReportColumn {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date';
  aggregation: 'none' | 'sum' | 'count' | 'avg';
}

export interface CustomReportConfig {
  id: string;
  title: string;
  dataSource: DataSourceType;
  subSource: string;
  columns: ReportColumn[];
  createdAt: string;
  enableDateFilter: boolean;
  dateColumn?: string;
  customLogoRight?: string;
  customLogoLeft?: string;
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
  limit: number;
}

export interface MainScreenSettings {
  title: string;
  logoRight: string;
  logoLeft: string;
  alignment: 'left' | 'center' | 'right';
  showClock: boolean;
  clockFormat: '12h' | '24h' | 'date-only';
  headerBackground: string;
  headerTextColor: string;
  titleFontSizePx?: number;
  titleFontWeight?: 'normal' | 'bold' | 'black';
  titleFontStyle?: 'normal' | 'italic';
  titleBackgroundColor?: string;
  titlePadding?: number;
  titleBorderRadius?: number;
  clockSize: 'sm' | 'md' | 'lg' | 'xl';
  titleFontSize: 'sm' | 'md' | 'lg' | 'xl';
  showTime: boolean;
  showDate: boolean;
  showSeconds?: boolean;
  clockLayout: 'row' | 'column';
  clockVerticalAlign: 'top' | 'center' | 'bottom';
  clockPosition: 'default' | 'under-title' | 'under-logo-right' | 'under-logo-left' | 'custom';
  clockX?: number;
  clockY?: number;
  clockScale?: number;
  headerHeight: number;
  logoRightWidth: number;
  logoRightHeight?: number;
  logoRightX?: number;
  logoRightY?: number;
  logoLeftWidth: number;
  logoLeftHeight?: number;
  logoLeftX?: number;
  logoLeftY?: number;
  fontFamily?: 'cairo' | 'inter' | 'mono' | 'serif';
}

export interface Client {
  id: string;
  code: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  phone?: string;
  address?: string;
}

export type CustomFieldTarget = 
  | 'sales_header' | 'sales_logistics' | 'sales_item' | 'sales_return' | 'sales_daily' | 'sales_report_client' | 'sales_report_item' | 'sales_report_general'
  | 'purchase_header' | 'purchase_item' | 'purchase_receive'
  | 'finished_production' | 'finished_issue' | 'finished_return' | 'finished_stocktaking' | 'finished_settlement'
  | 'raw_receive' | 'raw_issue' | 'raw_settlement'
  | 'general_custody' | 'general_parts' | 'general_catering'
  | 'product_main' | 'customer_main' | 'supplier_main';

export interface CustomField {
  id: string;
  label: string;
  options: string[];
  targets: CustomFieldTarget[];
  isRequired: boolean;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: Date;
}

export interface AppSettings {
  currency: string;
  taxRate: number;
  language: 'en' | 'ar';
  autoBackup: boolean;
  lowStockAlert: boolean;
  printerType: 'thermal' | 'a4';
  autoPrint: boolean;
  showClock: boolean;
  loginScreenLogo: string;
  loginScreenTitle?: string;
  globalAppTitle?: string;
  globalFooterText?: string;
  globalFooterVisible?: boolean;
  developerBio?: string;
  developerPhone?: string;
  printConfigs: Record<string, PrintConfig>;
  sequences: SequenceConfig;
  mainScreenSettings: MainScreenSettings;
  loadingEfficiencyConfig: any;
  unloadingEfficiencyConfig: any;
  storekeepers: string[];
  storekeepersRaw: string[]; 
  storekeepersFinished: string[]; 
  storekeepersParts: string[];
  clients: Client[];
  vendors: Vendor[];
  customFields: CustomField[];
  salesTypes: string[];
  executionEntities: string[];
  transportMethods: string[];
  suppliers: string[];
  customers: string[];
  weighmasters: string[];
  inspectors: string[];
  units: string[];
  categories: string[];
  shifts: string[];
  paymentMethods: string[];
  carTypes: string[];
  returnReasons: string[];
  departments: string[];
  loadingOfficers: string[];
  confirmationOfficers: string[];
  housingOfficers: string[]; 
  customReports: CustomReportConfig[];
  rawToleranceRate?: number;
  rawTransportCompanies?: string[];
  partsIssueTypes?: string[];
  partsSubWarehouses?: string[]; 
  partsOldPartsStatuses?: string[];
  expenseCategories: string[];
}
