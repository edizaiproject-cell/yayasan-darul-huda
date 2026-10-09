export type PaymentQr={qr_enabled?:boolean;qr_active?:boolean;qr_type?:string;qr_image?:string;qr_title?:string;qr_description?:string;qr_merchant?:string};
export const QR_TYPES=['QRIS','QR Rekening','QR Pembayaran Lainnya'];
export function hasPaymentQr(q:PaymentQr){return !!(q.qr_enabled&&q.qr_active&&q.qr_image)}
export function paymentQrBadge(q:PaymentQr){return hasPaymentQr(q)?q.qr_type==='QRIS'?'QRIS Aktif':'QR Aktif':'Belum Ada QR'}
