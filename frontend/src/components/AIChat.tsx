import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Box, Fab, Modal, Paper, TextField, IconButton, Typography, CircularProgress } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const postAICommand = async (payload: { command: string, conversation_id: string }): Promise<{ message: string }> => {
  const { data } = await api.post('/ai/command', payload);
  return data;
};

const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    if (!conversationId) {
      setConversationId(uuidv4());
      setMessages([{ sender: 'ai', text: "Hello! How can I help you today?" }]);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Optional: Reset conversation on close
    // setConversationId(null);
    // setMessages([]);
  };

  const mutation = useMutation({
    mutationFn: postAICommand,
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { sender: 'ai', text: data.message }]);
    },
    onError: (error) => {
       setMessages((prev) => [...prev, { sender: 'ai', text: `Error: ${error.message}` }]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || !conversationId) return;
    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    mutation.mutate({ command: input, conversation_id: conversationId });
    setInput('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1300 }} onClick={handleOpen}>
        <SmartToyIcon />
      </Fab>
      <Modal open={open} onClose={handleClose}>
        <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 400 }, height: { xs: '80%', sm: 500 }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">AI Assistant</Typography>
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
            {messages.map((msg, index) => (
              <Box key={index} sx={{ mb: 1.5, display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    p: 1.5,
                    borderRadius: '16px',
                    bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                    color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                    maxWidth: '80%',
                    boxShadow: 1,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </Typography>
              </Box>
            ))}
             {mutation.isPending && <Box sx={{display: 'flex', justifyContent: 'center'}}><CircularProgress size={24} /></Box>}
             <div ref={chatEndRef} />
          </Box>
          <Box sx={{ p: 2, display: 'flex', borderTop: 1, borderColor: 'divider' }}>
            <TextField fullWidth multiline maxRows={3} variant="outlined" size="small" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask me anything..." />
            <IconButton color="primary" onClick={handleSend} disabled={mutation.isPending} sx={{ ml: 1 }}><SendIcon /></IconButton>
          </Box>
        </Paper>
      </Modal>
    </>
  );
};

export default AIChat;