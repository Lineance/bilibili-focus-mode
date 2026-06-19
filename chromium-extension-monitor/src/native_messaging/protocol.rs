use std::io::{self, Read, Write};

/// Maximum message size (1 MB, per Chrome Native Messaging spec)
const MAX_MESSAGE_SIZE: usize = 1_048_576;

/// Read a message from reader (4-byte length prefix + JSON payload)
pub fn read_message(reader: &mut impl Read) -> io::Result<serde_json::Value> {
    // Read 4-byte length prefix (little-endian)
    let mut len_buf = [0u8; 4];
    reader.read_exact(&mut len_buf)?;
    let len = u32::from_le_bytes(len_buf) as usize;

    // Validate message size
    if len > MAX_MESSAGE_SIZE {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "Message too large: {} bytes (max {})",
                len, MAX_MESSAGE_SIZE
            ),
        ));
    }

    // Read JSON payload
    let mut msg_buf = vec![0u8; len];
    reader.read_exact(&mut msg_buf)?;

    // Parse JSON
    serde_json::from_slice(&msg_buf).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

/// Write a message to writer (4-byte length prefix + JSON payload)
pub fn write_message(writer: &mut impl Write, message: &serde_json::Value) -> io::Result<()> {
    // Serialize to JSON
    let json_bytes = serde_json::to_vec(message)?;
    let len = json_bytes.len();

    // Validate message size
    if len > MAX_MESSAGE_SIZE {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "Message too large: {} bytes (max {})",
                len, MAX_MESSAGE_SIZE
            ),
        ));
    }

    // Write 4-byte length prefix (little-endian)
    let len_bytes = (len as u32).to_le_bytes();
    writer.write_all(&len_bytes)?;

    // Write JSON payload
    writer.write_all(&json_bytes)?;

    // Flush
    writer.flush()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn test_read_write_message() {
        let message = serde_json::json!({
            "type": "ping",
            "timestamp": 1234567890
        });

        // Write message to buffer
        let mut buffer = Vec::new();
        write_message(&mut buffer, &message).unwrap();

        // Read message from buffer
        let mut cursor = Cursor::new(&buffer);
        let result = read_message(&mut cursor).unwrap();

        assert_eq!(result, message);
    }

    #[test]
    fn test_read_empty_message() {
        let message = serde_json::json!({});

        let mut buffer = Vec::new();
        write_message(&mut buffer, &message).unwrap();

        let mut cursor = Cursor::new(&buffer);
        let result = read_message(&mut cursor).unwrap();

        assert_eq!(result, message);
    }

    #[test]
    fn test_read_multiple_messages() {
        let msg1 = serde_json::json!({"type": "ping"});
        let msg2 = serde_json::json!({"type": "pong"});

        let mut buffer = Vec::new();
        write_message(&mut buffer, &msg1).unwrap();
        write_message(&mut buffer, &msg2).unwrap();

        let mut cursor = Cursor::new(&buffer);
        let result1 = read_message(&mut cursor).unwrap();
        let result2 = read_message(&mut cursor).unwrap();

        assert_eq!(result1, msg1);
        assert_eq!(result2, msg2);
    }

    #[test]
    fn test_read_eof() {
        let mut cursor = Cursor::new(Vec::<u8>::new());
        let result = read_message(&mut cursor);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().kind(), io::ErrorKind::UnexpectedEof);
    }
}
