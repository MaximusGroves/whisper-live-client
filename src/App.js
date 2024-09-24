import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Import Axios for making HTTP requests
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [latestResponse, setLatestResponse] = useState(null); // State to store the most recent response
  const ws = useRef(null);

  // Refs to manage request state and timing
  const isRequestPending = useRef(false);
  const lastRequestTime = useRef(0);
  const scheduledRequestTimeout = useRef(null);
  const lastMessagesSent = useRef([]); // To track the last messages sent

  // Ref to manage reconnection attempts
  const reconnectAttempts = useRef(0);
  // const maxReconnectAttempts = 10; // Maximum number of reconnection attempts
  const reconnectTimeout = useRef(null);

  const systemPrompt =
    "You are a helpful AI agent that exists to aid users in compiling their requests into itemized lists. You are receiving an ongoing voice transcript of a user's speech. Some data will appear repeated as the system parses the information. Your job is to keep track of what is being requested and making updates to your list if the user addresses what you've displayed and makes a correction. You are to respond in valid JSON only. Root level objects can have a name matching the request while any details about that item become properties within. So if they request a cheeseburger with 2 beef patties and four slices of cheese, you'll return {\"cheeseburger\": {\"beef_patties\":2, \"cheese_slices\":4}}. Make your best judgment when making a decision.";

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
            if (prevMessages[prevMessages.length - 1] === text) {
              // Do not update the array
              return prevMessages;
            } else {
              // Add the new message
              const newMessages = [...prevMessages, text];
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
        // Attempt to reconnect if the component is still mounted
        // if (reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.min(1000 * 2 ** reconnectAttempts.current, 30000); // Exponential backoff up to 30 seconds
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
            connectWebSocket();
          }, timeout);
        // } else {
        //   console.error('Maximum reconnection attempts reached. Could not reconnect to WebSocket server.');
        // }
      };
    };

    // Connect to WebSocket server
    connectWebSocket();

    // Cleanup function when component unmounts
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

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
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messageBodies,
        ],
      };

      isRequestPending.current = true;
      lastMessagesSent.current = messages;

      axios
        .post('https://airoute-ajebyave7a-uc.a.run.app/brain', requestBody, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then((response) => {
          console.log('Response:', response.data);
          // Update the latestResponse state
          setLatestResponse(response.data);
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

    // Function to check if latestResponse is valid JSON
    const isLatestResponseValidJSON = () => {
      if (!latestResponse) return false;
      try {
        // Try to parse latestResponse if it's a string
        if (typeof latestResponse === 'string') {
          JSON.parse(latestResponse);
        } else {
          // If it's an object, it's valid JSON
          JSON.stringify(latestResponse);
        }
        return true;
      } catch (e) {
        return false;
      }
    };

    // Rate-limiting and pending request check
    const timeSinceLastRequest = Date.now() - lastRequestTime.current;
    const shouldSendRequest =
      !isRequestPending.current &&
      timeSinceLastRequest >= 3000 &&
      ((messages.length > 0 && messages !== lastMessagesSent.current) ||
        !isLatestResponseValidJSON());

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

    // Cleanup function to clear the timeout when the component unmounts or dependencies change
    return () => {
      if (scheduledRequestTimeout.current) {
        clearTimeout(scheduledRequestTimeout.current);
        scheduledRequestTimeout.current = null;
      }
    };
  }, [messages, latestResponse, systemPrompt]);

  const displayMessages = messages.slice(-10);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-Time Transcription Viewer</h1>
        <div className="columns-container">
          <div className="column transcription-column">
            <h2>Transcriptions</h2>
            <div className="messages-container">
              {displayMessages.length === 0 ? (
                <p>No messages received yet.</p>
              ) : (
                displayMessages.map((message, index) => (
                  <p key={index}>{message}</p>
                ))
              )}
            </div>
          </div>
          <div className="column response-column">
            <h2>Latest Response</h2>
            <div className="response-container">
              {latestResponse ? (
                <pre>{JSON.stringify(latestResponse, null, 2)}</pre>
              ) : (
                <p>No response received yet.</p>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
