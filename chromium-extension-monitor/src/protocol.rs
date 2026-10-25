use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{self, Read, Write};

pub const MAX_FRAME: usize = 64 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Message {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub payload: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<u64>,
}
impl Message {
    pub fn new(kind: &str, payload: Value) -> Self {
        Self {
            kind: kind.into(),
            payload,
            timestamp: None,
        }
    }
}

/// Native Messaging and the local pipe both use bounded UTF-8 JSON frames.
pub fn read_frame<T: serde::de::DeserializeOwned>(reader: &mut impl Read) -> io::Result<Option<T>> {
    let mut header = [0; 4];
    if reader.read(&mut header[..1])? == 0 {
        return Ok(None);
    }
    reader.read_exact(&mut header[1..])?;
    let length = u32::from_ne_bytes(header) as usize;
    if length == 0 || length > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "message exceeds the application's 64 KiB limit or is empty",
        ));
    }
    let mut body = vec![0; length];
    reader.read_exact(&mut body)?;
    serde_json::from_slice(&body)
        .map(Some)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

pub fn write_frame(writer: &mut impl Write, value: &impl Serialize) -> io::Result<()> {
    let body = serde_json::to_vec(value)?;
    if body.len() > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "message exceeds the application's 64 KiB limit",
        ));
    }
    writer.write_all(&(body.len() as u32).to_ne_bytes())?;
    writer.write_all(&body)?;
    writer.flush()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::Cursor;
    #[test]
    fn utf8_and_multiple_frames_roundtrip() {
        let value = json!({"中文":"空格 \n"});
        let mut bytes = vec![];
        write_frame(&mut bytes, &value).unwrap();
        write_frame(&mut bytes, &json!("12345678")).unwrap();
        let mut reader = Cursor::new(bytes);
        assert_eq!(read_frame::<Value>(&mut reader).unwrap(), Some(value));
        assert_eq!(
            read_frame::<Value>(&mut reader).unwrap(),
            Some(json!("12345678"))
        );
        assert!(read_frame::<Value>(&mut reader).unwrap().is_none());
    }
    #[test]
    fn truncation_is_not_clean_eof() {
        for bytes in [vec![1], vec![4, 0, 0, 0, b'{']] {
            assert_eq!(
                read_frame::<Value>(&mut Cursor::new(bytes))
                    .unwrap_err()
                    .kind(),
                io::ErrorKind::UnexpectedEof
            );
        }
    }
    #[test]
    fn rejects_oversize_and_non_json_without_allocating_the_claimed_size() {
        for bytes in [(u32::MAX).to_ne_bytes().to_vec(), vec![1, 0, 0, 0, b'x']] {
            assert_eq!(
                read_frame::<Value>(&mut Cursor::new(bytes))
                    .unwrap_err()
                    .kind(),
                io::ErrorKind::InvalidData
            );
        }
    }
}
