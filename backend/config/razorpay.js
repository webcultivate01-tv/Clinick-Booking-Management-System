import crypto from 'crypto';
import Razorpay from 'razorpay';

let _instance = null;

/**
 * Lazy singleton — Razorpay throws synchronously if keys are missing, so we
 * only construct the client on first use. That lets the rest of the app boot
 * even when Razorpay credentials are not yet configured (e.g. fresh clone).
 */
export function getRazorpay() {
  if (_instance) return _instance;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    const err = new Error(
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env'
    );
    err.statusCode = 500;
    throw err;
  }

  _instance = new Razorpay({ key_id, key_secret });
  return _instance;
}

/**
 * Create an order with Razorpay.
 *   - amountInRupees: number; Razorpay needs paise, so we multiply by 100.
 *   - receipt: short string < 40 chars (their cap).
 */
export async function createOrder({ amountInRupees, receipt, notes = {} }) {
  const rp = getRazorpay();
  const order = await rp.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt: receipt.slice(0, 40),
    notes,
    payment_capture: 1, // auto-capture on success
  });
  return order;
}

/**
 * Verify the HMAC signature returned by Razorpay's checkout.
 * Per Razorpay docs:  HMAC_SHA256(order_id|payment_id, secret) === signature
 * We compute the expected signature server-side and constant-time compare —
 * never trust the client's value alone.
 */
export function verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    const err = new Error('Razorpay secret is not configured');
    err.statusCode = 500;
    throw err;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  // Reject on length mismatch — timingSafeEqual throws on different lengths.
  if (expected.length !== razorpay_signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(razorpay_signature, 'utf8')
  );
}

/**
 * Pull authoritative payment details from Razorpay after verification.
 * We don't blindly trust the client even after signature passes — we ask
 * Razorpay what they actually have.
 */
export async function fetchPayment(razorpay_payment_id) {
  const rp = getRazorpay();
  return rp.payments.fetch(razorpay_payment_id);
}

/**
 * Issue a (partial or full) refund through Razorpay.
 *   - amountInRupees: amount to refund. We send paise to Razorpay.
 *   - notes: free-form key/value (visible in Razorpay dashboard).
 *   - speed: 'normal' (default, 5-7 days) or 'optimum' (instant where supported).
 */
export async function refundPayment({ razorpay_payment_id, amountInRupees, notes = {}, speed = 'normal' }) {
  const rp = getRazorpay();
  return rp.payments.refund(razorpay_payment_id, {
    amount: Math.round(Number(amountInRupees) * 100),
    speed,
    notes,
  });
}
