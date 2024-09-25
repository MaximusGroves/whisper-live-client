import React, { useEffect } from 'react';
import { IconButton } from '@mui/material';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import Menu from './Menu';
import MenuModal from './MenuModal';

const MenuSelection = ({ selectedMenu, setSelectedMenu, menuOptions, startApp }) => {
  const [menuIndex, setMenuIndex] = React.useState(0); // Track the selected menu index

  const handleNextMenu = () => {
    setMenuIndex((prevIndex) => (prevIndex + 1) % menuOptions.length); // Increment the index cyclically
    setSelectedMenu( menuOptions[menuIndex === 0 ? menuOptions.length - 1 : menuIndex - 1]); // Update selected menu
  };

  const handlePrevMenu = () => {
    setMenuIndex((prevIndex) =>
      prevIndex === 0 ? menuOptions.length - 1 : prevIndex - 1
    );
    setSelectedMenu(
      menuOptions[menuIndex === 0 ? menuOptions.length - 1 : menuIndex - 1]
    );
  };

  useEffect(()=>{
    setSelectedMenu(menuOptions[0]);
  }, [])

  // Get the current menu details
  const currentMenu = menuOptions[menuIndex];

  return (
    <div className="menu-selection">
        <div className="menu-selector">
            {/* Left arrow */}
            <IconButton onClick={handlePrevMenu} style={{ color: 'white' }}>
            <KeyboardDoubleArrowLeftIcon />
            </IconButton>

            {/* Logo and Store Name */}
            <div className="menu-info">
            <img
                src={currentMenu.logoUrl}
                alt={`${currentMenu.storeName} Logo`}
                className="store-logo"
            />
            <h3 style={{color:'white'}}>{currentMenu.storeName}</h3>

            
            </div>

            {/* Right arrow */}
            <IconButton onClick={handleNextMenu} style={{ color: 'white' }}>
            <KeyboardDoubleArrowRightIcon />
            </IconButton>
        </div>
        <MenuModal menu={selectedMenu} startApp={startApp}/>
    </div>

  );
};

export default MenuSelection;
