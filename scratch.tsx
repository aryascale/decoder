export interface CategoryDetail {
  id: string;
  name: string;
  price: number;
  quota: number;
  sold: number;
  isHidden?: boolean;
  isClosed?: boolean;
}
