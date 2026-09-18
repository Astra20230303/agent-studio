# Attachment picker preflight acceptance

- Implementation commit: `191cf73`
- `pnpm --dir desktop run build`: passed.
- `node desktop/tests/attachment-picker-preflight-ui.cjs`: passed.
- `node desktop/tests/attachments-ui.cjs`: passed.
- `node desktop/tests/attachment-preflight-ui.cjs`: passed.
- `node desktop/tests/attachment-storage-ui.cjs`: passed.
- Verified corrupt image selection reports the exact decoder error and does not add the image to the draft; a non-image selected in the same batch remains attached.
- Existing send-time validation and storage/quota recovery remained green.
- No correction was required after acceptance.
