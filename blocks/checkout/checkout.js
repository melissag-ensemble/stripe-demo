import { events } from '@dropins/elsie/event-bus.js';
import { initializers } from '@dropins/elsie/initializer.js';
import * as checkoutApi from '@dropins/storefront-checkout/api.js';
import Checkout from '@dropins/storefront-checkout/containers/Checkout.js';
import { render as checkoutRenderer } from '@dropins/storefront-checkout/render.js';
import createTag from '../../utils/tag.js';
import {
  clearCartId,
  getCartId,
  placeOrder,
  setPaymentMethodOnCart,
} from '../../scripts/cart.js';
import { loadLoading } from '../../scripts/lib-franklin.js';
import { StripePlugin } from '../../scripts/stripe.js';

export default async function decorate(block) {
  const cartId = getCartId();
  if (!cartId) {
    window.location.href = '/cart';
    return;
  }
  initializers.register(checkoutApi.initialize);

  async function proceedPlaceOrder(paymentMethod) {
    const loading = await loadLoading();
    await setPaymentMethodOnCart(paymentMethod.id, cartId);
    const order = await placeOrder(cartId);
    loading.remove();
    clearCartId();
    block.replaceWith(
      createTag(
        'div',
        { className: 'checkout-complete' },
        `<p class='thank-you'>Thank you for shopping!</p><p class='order-number'>Your order <b>#${order.order_number}</b> has been placed.</p><a href='/' class='primary button'>Continue Shopping</a>`
      )
    );
  }

  checkoutRenderer.render(Checkout, {
    slots: {
      PaymentMethods: (_, context) => {
        context.addPaymentMethodHandler('checkmo', {
          render: (element, context) => {
            console.log('handler context', context);
            if (element) {
              element.innerHTML = `<div>Custom Check / Money order handler</div>`;
            }
          },
        });

        context.addPaymentMethodHandler('stripe_payments', {
          render: async (element, context) => {
            const stripe = new StripePlugin({
              key: 'pk_test_51Nrs0ML1DV9f5cSo8SGP5fqOt9ypRLqBSKBv4rfbRPOGezL5t5sUMV7mHGlRdd9455BXOwoBngtEWo35EEgc7UHD00Ajy9FWgK',
              clientSecret:
                'pi_3NsZkUL1DV9f5cSo0t4biUBY_secret_hbaemymPGMHsuf8oxqMYthy2p',
            });
            stripe.init(element, context, (paymentMethod) =>
              proceedPlaceOrder(paymentMethod)
            );
          },
        });
      },
    },
  })(block);
  events.emit('cart/data', { id: cartId });
}
