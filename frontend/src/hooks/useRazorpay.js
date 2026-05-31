import { useCallback } from 'react';

/**
 * Tiny hook around the global `window.Razorpay` checkout (loaded via
 * <script> tag in index.html). Returns an `openCheckout` function that
 * opens the modal and resolves with the success / failure handlers passed in.
 *
 * Usage:
 *   const { openCheckout } = useRazorpay();
 *   openCheckout({ order, patient, onSuccess, onDismiss });
 */
export function useRazorpay() {
  const openCheckout = useCallback(({ order, patient, name, description, onSuccess, onDismiss }) => {
    if (!window.Razorpay) {
      throw new Error('Razorpay SDK is not loaded. Check the <script> tag in index.html.');
    }

    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,        // paise
      currency: order.currency,
      order_id: order.id,
      name: name || 'Lumière Skin Clinic',
      description: description || 'Appointment booking fee',
      prefill: patient
        ? { name: patient.full_name, email: patient.email, contact: patient.mobile }
        : undefined,
      theme: { color: '#b8935a' },
      modal: {
        ondismiss: () => onDismiss?.(),
      },
      handler: (response) => onSuccess?.(response),
    });

    rzp.on('payment.failed', (resp) => onDismiss?.(resp?.error));
    rzp.open();
  }, []);

  return { openCheckout };
}
