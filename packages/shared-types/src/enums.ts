export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
}

export enum SuperAdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SUPPORT = 'SUPPORT',
}

export enum ItemType {
  CERTIFIED_DIAMOND = 'CERTIFIED_DIAMOND',
  LOOSE_DIAMOND = 'LOOSE_DIAMOND',
  JEWELRY = 'JEWELRY',
}

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  ON_HOLD = 'ON_HOLD',
  ON_MEMO = 'ON_MEMO',
  IN_TRANSIT = 'IN_TRANSIT',
  IN_MANUFACTURING = 'IN_MANUFACTURING',
  SOLD = 'SOLD',
  RETURNED_TO_SUPPLIER = 'RETURNED_TO_SUPPLIER',
  CONSUMED = 'CONSUMED',
  LOST = 'LOST',
}

export enum DiamondShape {
  ROUND = 'ROUND',
  PRINCESS = 'PRINCESS',
  CUSHION = 'CUSHION',
  OVAL = 'OVAL',
  EMERALD = 'EMERALD',
  PEAR = 'PEAR',
  MARQUISE = 'MARQUISE',
  RADIANT = 'RADIANT',
  ASSCHER = 'ASSCHER',
  HEART = 'HEART',
  BAGUETTE = 'BAGUETTE',
  OTHER = 'OTHER',
}

export enum DiamondColor {
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
  H = 'H',
  I = 'I',
  J = 'J',
  K = 'K',
  L = 'L',
  M = 'M',
  N_TO_Z = 'N_TO_Z',
  FANCY = 'FANCY',
}

export enum DiamondClarity {
  FL = 'FL',
  IF = 'IF',
  VVS1 = 'VVS1',
  VVS2 = 'VVS2',
  VS1 = 'VS1',
  VS2 = 'VS2',
  SI1 = 'SI1',
  SI2 = 'SI2',
  SI3 = 'SI3',
  I1 = 'I1',
  I2 = 'I2',
  I3 = 'I3',
}

export enum GradeQuality {
  EXCELLENT = 'EXCELLENT',
  VERY_GOOD = 'VERY_GOOD',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export enum Fluorescence {
  NONE = 'NONE',
  FAINT = 'FAINT',
  MEDIUM = 'MEDIUM',
  STRONG = 'STRONG',
  VERY_STRONG = 'VERY_STRONG',
}

export enum CertificateLab {
  GIA = 'GIA',
  IGI = 'IGI',
  HRD = 'HRD',
  GSI = 'GSI',
  SGL = 'SGL',
  OTHER = 'OTHER',
}

export enum MetalType {
  GOLD_24K = 'GOLD_24K',
  GOLD_22K = 'GOLD_22K',
  GOLD_18K = 'GOLD_18K',
  GOLD_14K = 'GOLD_14K',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  OTHER = 'OTHER',
}

export enum CustomerType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  DEALER = 'DEALER',
}

export enum VendorType {
  LOCAL = 'LOCAL',
  IMPORT = 'IMPORT',
}

export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum SaleType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  MEMO_CONVERSION = 'MEMO_CONVERSION',
  EXPORT = 'EXPORT',
  EXCHANGE = 'EXCHANGE',
}

export enum SaleStatus {
  DRAFT = 'DRAFT',
  PENDING_DISCOUNT_APPROVAL = 'PENDING_DISCOUNT_APPROVAL',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

export enum MemoStatus {
  OPEN = 'OPEN',
  PARTIALLY_RETURNED = 'PARTIALLY_RETURNED',
  CLOSED = 'CLOSED',
  CONVERTED = 'CONVERTED',
}

export enum MemoItemStatus {
  ON_MEMO = 'ON_MEMO',
  RETURNED = 'RETURNED',
  SOLD = 'SOLD',
}

export enum HoldStatus {
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
}

export enum TransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  REJECTED = 'REJECTED',
}

export enum ManufacturingStatus {
  ISSUED = 'ISSUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MovementType {
  PURCHASE_IN = 'PURCHASE_IN',
  PURCHASE_RETURN_OUT = 'PURCHASE_RETURN_OUT',
  SALE_OUT = 'SALE_OUT',
  SALES_RETURN_IN = 'SALES_RETURN_IN',
  MEMO_OUT = 'MEMO_OUT',
  MEMO_RETURN_IN = 'MEMO_RETURN_IN',
  HOLD = 'HOLD',
  HOLD_RELEASE = 'HOLD_RELEASE',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  MANUFACTURING_ISSUE = 'MANUFACTURING_ISSUE',
  MANUFACTURING_RETURN = 'MANUFACTURING_RETURN',
  SPLIT_OUT = 'SPLIT_OUT',
  SPLIT_IN = 'SPLIT_IN',
  MERGE_OUT = 'MERGE_OUT',
  MERGE_IN = 'MERGE_IN',
  WEIGHT_ADJUSTMENT = 'WEIGHT_ADJUSTMENT',
  RECONCILIATION_ADJUSTMENT = 'RECONCILIATION_ADJUSTMENT',
  OPENING_STOCK = 'OPENING_STOCK',
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum PaymentDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export enum MediaKind {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CERTIFICATE = 'CERTIFICATE',
  INVOICE = 'INVOICE',
  DOCUMENT = 'DOCUMENT',
}

export enum ReconciliationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationType {
  HOLD_EXPIRY = 'HOLD_EXPIRY',
  MEMO_EXPIRY = 'MEMO_EXPIRY',
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  STOCK_LOW = 'STOCK_LOW',
  TRANSFER_RECEIVED = 'TRANSFER_RECEIVED',
  PAYMENT_DUE = 'PAYMENT_DUE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
}
