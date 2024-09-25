import React from "react";



const MenuItem = ({ item }) => {
  const { display_name, base_price, toppings, without, options } = item;

  return (
    <div className="menu-item">
      <h2 style={{textAlign:'center', margin:"40px 0 20px"}}>{display_name} - ${base_price.toFixed(2)}</h2>
      <h3 style={{textAlign:'left'}}>Toppings:</h3>
      <ul>
        {toppings && Object.entries(toppings).map(([key, topping]) => (
          <li key={key} style={{textAlign:"left"}}>{topping.display_name}: +${topping.price.toFixed(2)}</li>
        ))}
      </ul>
      {without && (
        <>
          <h3 style={{textAlign:'left'}}>Without:</h3>
          <ul>
            {Object.entries(without).map(([key, withoutItem]) => (
              <li key={key} style={{textAlign:"left"}}>{withoutItem.display_name}: {withoutItem.price < 0 ? '' : '+'}${withoutItem.price.toFixed(2)}</li>
            ))}
          </ul>
        </>
      )}
      {options && (
        <>
          <h3 style={{textAlign:'left'}}>Options:</h3>
          <ul>
            {Object.entries(options).map(([key, option]) => (
              <li style={{textAlign:"left"}} key={key}>{option.display_name}: +${option.price.toFixed(2)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const Menu = ({menu}) => {
  return (
    <div className="menu" >
      {Object.entries(menu).map(([key, item]) => (
        <MenuItem key={key} item={item} />
      ))}
    </div>
  );
};

export default Menu;