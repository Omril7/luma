/**
 * Site-wide feature toggles.
 *
 * `shop` puts the shop/product/cart/checkout flow on hold without deleting any
 * of the underlying code — flip back to `true` to relaunch it.
 */
export const FEATURES = {
  shop: false,
} as const
