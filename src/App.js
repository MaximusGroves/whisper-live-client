import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Import Axios for making HTTP requests
import './App.css';
import { Button } from '@mui/material';
import { SmsFailed } from '@mui/icons-material';

import menu1 from './menu1.json';
import menu2 from './menu2.json';

import OrderSummary from './OrderSummary';
import MenuSelection from './MenuSelection';

import { prependedMsgsMenu1, prependedMsgsMenu2 } from './prompts';

function App() {
  const [messages, setMessages] = useState([]);
  const lastWsMessage = useRef('');
  const [latestResponse, setLatestResponse] = useState(null); // State to store the most recent response
  const [appRunning, setAppRunning] = useState(false);
  const [lastJsonValid, setLastJsonValid] = useState(true);
  const appRunningRef = useRef(false);

  const cancelResetTimeoutRef = useRef();

  const [checkoutData, setCheckoutData] = useState('');

  const ws = useRef(null);

  // Refs to manage request state and timing
  const isRequestPending = useRef(false);
  const lastRequestTime = useRef(0);
  const scheduledRequestTimeout = useRef(null);
  const lastMessagesSent = useRef([]); // To track the last messages sent
  const lastMessagesLengthSent = useRef(0); // To track the last messages length sent

  // Ref to manage reconnection attempts
  const reconnectAttempts = useRef(0);
  // const maxReconnectAttempts = 10; // Maximum number of reconnection attempts
  const reconnectTimeout = useRef(null);

  const menuOptions = [
    { logoUrl: '/national.jpg', storeName: 'The National', menu: menu1, msgs: prependedMsgsMenu1 },
    { logoUrl: '/cinco.jpg', storeName: 'Cinco Sentidos', menu: menu2, msgs: prependedMsgsMenu2 },
    // { logoUrl: '/terminal.jpg', storeName: 'Terminal', menu: 3 }
  ];

  const [selectedMenu, setSelectedMenu] = useState(menuOptions[0]); // Default menu selection

  

  // State for typing animation
  const typedTextRef = useRef('');
  const typingIntervalRef = useRef(null);

  useEffect(() => {
    // Function to create a new WebSocket connection
    const connectWebSocket = () => {
      // Replace with your relay server's host and port
      const relayHost = 'localhost';
      const relayPort = 9091;
      const wsUrl = `ws://${relayHost}:${relayPort}`;

      // Create a new WebSocket connection
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Connected to relay server');
        reconnectAttempts.current = 0; // Reset reconnection attempts on successful connection
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const text = data.text;

          setMessages((prevMessages) => {
            // Check if the new message is identical to the previous one
            // console.log('text')
            // console.log(text)
            // console.log('lastWsMessage?.current')
            // console.log(lastWsMessage?.current)
            // console.log('prevMessages[prevMessages.length - 1]')
            // console.log(prevMessages[prevMessages.length - 1])
            // if (prevMessages[prevMessages.length - 1] === text || (text === lastWsMessage?.current && prevMessages.length === 0)) {
            if (prevMessages[prevMessages.length - 1] === text ) {
              // Do not update the array
              console.log('skipping new message')
              return prevMessages;
            } else {
              // Add the new message
              console.log('saving new message')
              const newMessages = [...prevMessages, text];
              lastWsMessage.current = text;
              return newMessages;
            }
          });
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);

        if (appRunningRef.current === true) {
          // Attempt to reconnect if the component is still mounted
          const timeout = Math.min(1000 * 2 ** reconnectAttempts.current, 30000); // Exponential backoff up to 30 seconds
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
            connectWebSocket();
          }, timeout);
        }
      };
    };

    // Connect to WebSocket server
    if (appRunningRef.current === true) {
      console.log('Attempting to connect to socket');
      connectWebSocket();
    } else {
      console.log('Attempting to close socket');
      if (ws.current) {
        ws.current.close();
      }
    }

    // Cleanup function when component unmounts
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [appRunning]);

  // Effect hook to handle Axios POST requests when messages or latestResponse change
  useEffect(() => {
    // Function to send the Axios POST request
    const sendRequest = () => {
      // Prepare the request body
      const messageBodies = messages.map((msg) => ({
        role: 'user',
        content: msg,
      }));
      // Add the system message at the beginning
      const requestBody = {
        messages: [...selectedMenu.msgs, ...messageBodies],
      };

      isRequestPending.current = true;
      lastMessagesSent.current = messages;
      lastMessagesLengthSent.current = messages.length; // Update the last sent messages length

      axios
        .post('https://airoute-ajebyave7a-uc.a.run.app/brain', requestBody, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then((response) => {
          console.log('Response:', response.data);
          // Update the latestResponse state
          if (appRunning) {
            if (isLatestResponseValidJSON()) {
              setLatestResponse(response.data);
              if (response.data?.app_state === 'exit') {
                console.log('attempting to exit app');
                stopApp();
              } else if (response.data?.app_state === 'checkout') {
                console.log('attempting to checkout');
                checkout();
              }
            }
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          // Optionally, update latestResponse to indicate an error
          setLatestResponse({
            error: 'An error occurred while fetching the response.',
          });
        })
        .finally(() => {
          isRequestPending.current = false;
          lastRequestTime.current = Date.now();
          scheduledRequestTimeout.current = null;
        });
    };

    // Rate-limiting and pending request check
    const timeSinceLastRequest = Date.now() - lastRequestTime.current;
    const messagesLengthIncreased = messages.length > lastMessagesLengthSent.current;
    const shouldSendRequest =
      !isRequestPending.current &&
      ((messages.length > 0 && messagesLengthIncreased) || !lastJsonValid);

    if (shouldSendRequest) {
      if (timeSinceLastRequest >= 3000) {
        // Send the request immediately
        if (scheduledRequestTimeout.current) {
          clearTimeout(scheduledRequestTimeout.current);
          scheduledRequestTimeout.current = null;
        }
        sendRequest();
      } else {
        // Schedule a request after the remaining time
        if (!scheduledRequestTimeout.current) {
          const delay = 3000 - timeSinceLastRequest;
          scheduledRequestTimeout.current = setTimeout(() => {
            sendRequest();
          }, delay);
        }
      }
    }
    // No cleanup function here to prevent clearing the timeout on dependency changes
  }, [messages, latestResponse, appRunning, selectedMenu]);

  // Cleanup function to clear the timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (scheduledRequestTimeout.current) {
        clearTimeout(scheduledRequestTimeout.current);
        scheduledRequestTimeout.current = null;
      }
    };
  }, []);

  // Function to check if latestResponse is valid JSON
  const isLatestResponseValidJSON = () => {
    if (!latestResponse) return true;
    try {
      // Try to parse latestResponse if it's a string
      if (typeof latestResponse === 'string') {
        JSON.parse(latestResponse);
      } else {
        // If it's an object, it's valid JSON
        JSON.stringify(latestResponse);
      }
      setLastJsonValid(true);
      return true;
    } catch (e) {
      setLastJsonValid(false);
      return false;
    }
  };

  // Typing effect with ref
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      let index = 0;
      clearInterval(typingIntervalRef.current);
      typedTextRef.current = '';

      typingIntervalRef.current = setInterval(() => {
        if (index < lastMessage.length) {
          typedTextRef.current += lastMessage.charAt(index);
          index++;
          document.getElementById('typing').textContent = typedTextRef.current;
        } else {
          clearInterval(typingIntervalRef.current);
        }
      }, 10);
    }

    return () => {
      clearInterval(typingIntervalRef.current);
    };
  }, [messages]);

  const displayMessages = messages.slice(-5);

  const startApp = () => {
    setAppRunning(true);
    appRunningRef.current = true;

    isRequestPending.current = false;
    lastMessagesSent.current = messages;
    lastMessagesLengthSent.current = messages.length;
  };

  const stopApp = () => {
    setAppRunning(false);
    appRunningRef.current = false;
    setMessages([]);
    setLatestResponse('');
    typedTextRef.current = '';
    
  };

  const checkout = () => {
    setCheckoutData(latestResponse);
    setAppRunning(false);
    appRunningRef.current = false;
    setMessages([]);
    setLatestResponse('');
    typedTextRef.current = '';
    
    cancelResetTimeoutRef.current = setTimeout(() => {
      setCheckoutData(undefined);
    }, 5000);
  };

  return (
    <div className="App" style={{overflow:'hidden'}}>
      {!appRunning && (
        <div className="button-overlay">
          <div className="grid-container">
            {checkoutData ? (
              <OrderSummary order={checkoutData?.order} menu={selectedMenu.menu} />
            ) : (
              <MenuSelection
                selectedMenu={selectedMenu}
                setSelectedMenu={setSelectedMenu}
                menuOptions={menuOptions} // Pass the array of menu options
              />
            )}

            <Button
              className="btn-center-screen"
              variant="contained"
              onClick={checkoutData ? ()=>{
                setCheckoutData(undefined);
                
                clearTimeout(cancelResetTimeoutRef.current);
              } : startApp}
            >
              {checkoutData?.order ? 'Finish' : 'Start Ordering'}
            </Button>
          </div>
        </div>
      )}
      {appRunning && selectedMenu && (
        <img src={selectedMenu.logoUrl} alt={`${selectedMenu.storeName} Logo`} 
        className="store-logo"/>
        )}
      <div className={appRunning ? 'app-screen' : 'app-screen blur'}>
        <div className="footer">
          {latestResponse && latestResponse.order && appRunning ? (
            <OrderSummary order={latestResponse.order} menu={selectedMenu.menu} />
          ) : (
            <p>No items in the order yet.</p>
          )}

          <div className="columns-container">
            <div className="column transcription-column">
              <div className="messages-container">
                {displayMessages.length === 0 ? (
                  <p>No messages received yet.</p>
                ) : (
                  <div className="transcription-messages">
                    {displayMessages.slice(0, -1).map((message, index) => (
                      <p key={index}>{message}</p>
                    ))}
                    <p id="typing"></p>
                  </div>
                )}
              </div>
            </div>
            <div className="column response-column">
              {!lastJsonValid && (
                <div className="sms-failed-icon">
                  <SmsFailed />
                </div>
              )}
              <div className={'response-container'}>
                {latestResponse ? (
                  <pre>{JSON.stringify(latestResponse, null, 2)}</pre>
                ) : (
                  <p>No response received yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        {appRunning && (
          <Button className="checkout-btn" variant="contained" onClick={checkout}>
            Checkout
          </Button>
        )}
      </div>
    </div>
  );
}

export default App;
