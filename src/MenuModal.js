import * as React from 'react';
import PropTypes from 'prop-types';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useSpring, animated } from '@react-spring/web';
import Menu from './Menu';

const Fade = React.forwardRef(function Fade(props, ref) {
  const {
    children,
    in: open,
    onClick,
    onEnter,
    onExited,
    ownerState,
    ...other
  } = props;
  const style = useSpring({
    from: { opacity: 0 },
    to: { opacity: open ? 1 : 0 },
    onStart: () => {
      if (open && onEnter) {
        onEnter(null, true);
      }
    },
    onRest: () => {
      if (!open && onExited) {
        onExited(null, true);
      }
    },
  });

  return (
    <animated.div ref={ref} style={style} {...other}>
      {React.cloneElement(children, { onClick })}
    </animated.div>
  );
});

Fade.propTypes = {
  children: PropTypes.element.isRequired,
  in: PropTypes.bool,
  onClick: PropTypes.any,
  onEnter: PropTypes.func,
  onExited: PropTypes.func,
  ownerState: PropTypes.any,
};

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  height:'100vh',
  overflowY:'auto',
  display:'block', 
  textAlign:'center'
};

const imgStyle = {
  margin:'0 auto',
  maxWidth: '100%',
  display:'block',
  textAlign:'center'
};

export default function MenuModal({menu, startApp, imgBtn}) {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <div>

      {imgBtn !== undefined ? (
        <Button variant="contained" color="secondary" 
        onClick={handleOpen} style={{padding:0, backgroundColor:'transparent'}}>
          <img style={{padding:0, margin:0}} src={imgBtn} alt={`${menu.storeName} Logo`} className="store-logo"/>
      </Button>) : (<Button variant="contained" color="secondary" 
        onClick={handleOpen} style={{marginTop:20}}>
          Open Menu
      </Button>)}

      
      <Modal
        aria-labelledby="spring-modal-title"
        aria-describedby="spring-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            TransitionComponent: Fade,
          },
        }}
      >
        <Fade in={open}>
          <div>
            <Button onClick={handleClose} variant="contained" color="secondary" style={{position:"absolute", left: "5%", bottom:"5%"}}>Close Menu</Button>
            {startApp !== undefined && <Button onClick={()=>{handleClose(); startApp();}} variant="contained" style={{position:"absolute", right: "5%", bottom:"5%"}}>Start Ordering</Button>}
            
            <Box sx={style}>
              <img
                  sx={imgStyle}
                  src={menu.logoUrl}
                  alt={`${menu.storeName} Logo`}
                  className="store-logo"
              />
              <Menu menu={menu.menu}/>
              
            </Box>
          </div>
        </Fade>
      </Modal>
    </div>
  );
}
