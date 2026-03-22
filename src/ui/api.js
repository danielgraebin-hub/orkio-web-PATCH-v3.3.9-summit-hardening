// ORKIO AppConsole PATCH v4.1 — realtime/chat separation hardening //
Apply this block inside AppConsole.jsx (top-level helpers section)

function appendChatMessageSafe(setMessages, msg) { if (!msg) return; if
(msg.__realtime === true) return; // block realtime transcripts
setMessages(prev => […prev, msg]); }

function commitRealtimeAssistantFinal({ text, meta = {},
queueRealtimeEvent, rtcLastAssistantFinalRef,
rtcAssistantFinalCommittedRef }) { if (!text) return;

rtcLastAssistantFinalRef.current = text;
rtcAssistantFinalCommittedRef.current = true;

queueRealtimeEvent({ event_type: “response.final”, role: “assistant”,
content: text, is_final: true, meta: { source: “realtime”, …meta } });

// IMPORTANT: // Do NOT inject realtime transcript into chat messages.
// Chat UI must only display intentional text-channel messages. }

// Replace ANY occurrence of: // // setMessages(prev => […prev, msg]) //
// with: // // appendChatMessageSafe(setMessages, msg); // // inside
realtime transcript handlers.

// Confirm transcript ingestion pipeline remains: // //
queueRealtimeEvent({ // event_type: “transcript.final”, // role: “user”,
// content: raw, // is_final: true, // meta: { source: “realtime” } //
}); // // WITHOUT UI insertion.
