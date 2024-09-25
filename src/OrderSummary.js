import React from 'react';

const OrderSummary = ({ order, menu }) => {
  const calculateSubtotal = () => {
    let subtotal = 0;
    Object.keys(order).forEach((itemKey) => {
      const menuItem = menu[itemKey]; // Check if menuItem exists
      if (!menuItem) return;

      order[itemKey].forEach((item) => {
        // Add base price
        subtotal += menuItem?.base_price || 0;

        // Add toppings prices
        if (item.toppings) {
          Object.keys(item.toppings).forEach((topping) => {
            const toppingPrice = menuItem?.toppings?.[topping]?.price;
            subtotal += (toppingPrice || 0) * item.toppings[topping];
          });
        }

        // Handle the "without" section (subtracting prices for omitted items)
        if (item.without) {
          Object.keys(item.without).forEach((withoutItem) => {
            const withoutPrice = menuItem?.without?.[withoutItem]?.price;
            subtotal += (withoutPrice || 0) * item.without[withoutItem];
          });
        }

        // Handle vegan option
        if (item.options && item.options.vegan) {
          subtotal += menuItem?.options?.vegan?.price || 0;
        }
      });
    });
    return subtotal.toFixed(2);
  };

  const formatCurrency = (value) => `$${value.toFixed(2)}`;

  return (
    <div className="order-summary" style={{maxHeight:'75vh', overflowY:'auto', marginBottom:0}}>
      <h2>Your Order</h2>
      <ul>
        {Object.keys(order).map((itemKey) => {
          const menuItem = menu[itemKey]; // Check if the menuItem exists
          if (!menuItem) return null; // Skip if undefined

          return (
            <li key={itemKey}>
              <h3>{menuItem?.display_name || itemKey}</h3>
              {order[itemKey].map((item, index) => (
                <div key={item.id} className="order-item">
                  <h3>
                    <strong>
                      {menuItem?.display_name || itemKey} #{index + 1}
                    </strong>{' '}
                    - {formatCurrency(menuItem?.base_price || 0)}
                  </h3>
                  {item.toppings && (
                    <p>
                      <strong>Toppings:</strong>{' '}
                      {Object.keys(item.toppings).map((topping) => {
                        const toppingCost =
                          (menuItem?.toppings?.[topping]?.price || 0) *
                          item.toppings[topping];
                        return menuItem?.toppings?.[topping]?.display_name ? (
                          <p key={topping}>
                            {menuItem.toppings[topping].display_name} x
                            {item.toppings[topping]} -{' '}
                            {formatCurrency(toppingCost)}
                          </p>
                        ) : null;
                      })}
                    </p>
                  )}
                  {item.without && (
                    <p>
                      <strong>Without:</strong>{' '}
                      {Object.keys(item.without).map((withoutItem) => (
                        <span key={withoutItem}>
                          {menuItem?.without?.[withoutItem]?.display_name
                            ? `${menuItem.without[withoutItem].display_name} (Subtract ${formatCurrency(
                                menuItem.without[withoutItem].price
                              )})`
                            : null}
                        </span>
                      ))}
                    </p>
                  )}
                  {item.options && item.options.vegan && (
                    <p>
                      <strong>Vegan Option:</strong>{' '}
                      {menuItem?.options?.vegan?.price
                        ? formatCurrency(menuItem.options.vegan.price)
                        : null}
                    </p>
                  )}
                </div>
              ))}
            </li>
          );
        })}
      </ul>
      <h3>Subtotal: {formatCurrency(parseFloat(calculateSubtotal()))}</h3>
    </div>
  );
};

export default OrderSummary;
