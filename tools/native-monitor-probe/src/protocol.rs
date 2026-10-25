use std::io::{self, Read, Write};

use serde_json::Value;

pub const MAX_FRAME: usize = 64 * 1024;

/// Return None only for clean EOF before the next header.
pub fn read_frame(reader: &mut impl Read) -> io::Result<Option<Value>> {
    let mut header = [0; 4];
    if reader.read(&mut header[..1])? == 0 {
        return Ok(None);
    }
    reader.read_exact(&mut header[1..])?;
    let length = u32::from_ne_bytes(header) as usize;
    if length == 0 || length > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "invalid frame length",
        ));
    }
    let mut bytes = vec![0; length];
    reader.read_exact(&mut bytes)?;
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

pub fn write_frame(writer: &mut impl Write, value: &Value) -> io::Result<()> {
    let bytes = serde_json::to_vec(value)?;
    if bytes.is_empty() || bytes.len() > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "invalid frame length",
        ));
    }
    writer.write_all(&(bytes.len() as u32).to_ne_bytes())?;
    writer.write_all(&bytes)?;
    writer.flush()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::Cursor;

    #[test]
    fn unicode_and_newline_bytes_roundtrip_in_multiple_frames() {
        let first = json!({"text": "中文 / 空格 / \n", "padding": "x".repeat(240)});
        let second = json!({"type": "heartbeat"});
        let mut bytes = vec![];
        write_frame(&mut bytes, &first).unwrap();
        // The following 10-byte JSON value puts 0x0A into the length header,
        // which is significant when testing Windows text-mode corruption.
        write_frame(&mut bytes, &json!("12345678")).unwrap();
        write_frame(&mut bytes, &second).unwrap();
        let mut reader = Cursor::new(bytes);
        assert_eq!(read_frame(&mut reader).unwrap(), Some(first));
        assert_eq!(read_frame(&mut reader).unwrap(), Some(json!("12345678")));
        assert_eq!(read_frame(&mut reader).unwrap(), Some(second));
        assert_eq!(read_frame(&mut reader).unwrap(), None);
    }

    #[test]
    fn partial_headers_and_bodies_are_errors_not_clean_disconnects() {
        for bytes in [vec![1], vec![1, 0, 0], vec![5, 0, 0, 0, b'{']] {
            assert_eq!(
                read_frame(&mut Cursor::new(bytes)).unwrap_err().kind(),
                io::ErrorKind::UnexpectedEof
            );
        }
    }

    #[test]
    fn rejects_invalid_json_and_oversized_frames_before_allocation() {
        for bytes in [
            vec![1, 0, 0, 0, b'x'],
            ((MAX_FRAME + 1) as u32).to_ne_bytes().to_vec(),
        ] {
            assert_eq!(
                read_frame(&mut Cursor::new(bytes)).unwrap_err().kind(),
                io::ErrorKind::InvalidData
            );
        }
    }

    #[test]
    fn fragmented_reads_are_supported() {
        struct Fragmented(Cursor<Vec<u8>>);
        impl Read for Fragmented {
            fn read(&mut self, bytes: &mut [u8]) -> io::Result<usize> {
                let length = bytes.len().min(1);
                self.0.read(&mut bytes[..length])
            }
        }
        let value = json!({"type":"hello"});
        let mut bytes = vec![];
        write_frame(&mut bytes, &value).unwrap();
        assert_eq!(
            read_frame(&mut Fragmented(Cursor::new(bytes))).unwrap(),
            Some(value)
        );
    }
}
