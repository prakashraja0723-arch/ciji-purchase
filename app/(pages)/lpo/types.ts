export interface RequestItem {
  itemType: 'Accessories' | 'Aluminum';
  itemName: string;
  qty: number;
  accCode?: string;
  code?: string;
  description?: string;
  length?: number;
  kg?: number;
  orderedQty?: number;
  itemStatus?: string;
  price?: number;
  totalWeight?: number;
  lineTotal?: number;
}

export interface LpoData {
  lpoNo?: string;
  materialRequestNo?: string;
  projectName?: string;
  supplierName?: string;
  supplierTrn?: string;
  requestType?: 'Accessories' | 'Aluminum';
  storekeeperUid?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  items: RequestItem[];
}

export interface SupplierDbItem {
  id: string;
  vendorName: string;
  trn: string;
}

export interface AluDbInfo {
  weightPerMeter: number;
  length: number;
}