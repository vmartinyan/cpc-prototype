/**
 * Կառուցիչի պայմանի խմբագրիչ (COM-01)։
 *   • բաղադրիչները (doc.*, ext.*, var.*, rule.*, count(...), sum(...) ...) ցուցադրվում են որպես չիպեր՝
 *     նույն գույներով, ինչ «Փոփոխականներ» վահանակում
 *   • Backspace/Delete-ով չիպը ջնջվում է ամբողջությամբ
 *   • չիպի վրա սավառնելիս ցուցադրվում է բաղադրիչի հայերեն անվանումը
 * Չիպ է դառնում միայն ճանաչված բաղադրիչը (describe(tok) !== null). անծանոթը մնում է տեքստ։
 * Արժեքը պահվում է սովորական տողով. խմբագրիչը միայն ցուցադրման շերտ է։
 */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Box, FormHelperText, Paper, Popper, Typography } from '@mui/material';

const TOKEN_RE = /\b(?:count|sum|min|max|avg)\(\s*[A-Za-z0-9_.]+\s*\)|\b(?:doc|ext|var)\.[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*|\brule\.[A-Za-z0-9_.-]*[A-Za-z0-9_]/g;
const ZW = '​'; // կուրսորի տեղադրման համար չիպերի միջև (արժեքի մեջ չի մտնում)

/** Արժեքը՝ տեքստի և ճանաչված բաղադրիչների հատվածներ */
function segments(value, describe) {
  const out = [];
  let last = 0;
  for (const m of value.matchAll(TOKEN_RE)) {
    const info = describe(m[0]);
    if (!info) continue;
    if (m.index > last) out.push({ text: value.slice(last, m.index) });
    out.push({ tok: m[0], info, start: m.index, end: m.index + m[0].length });
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push({ text: value.slice(last) });
  return out;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function toHtml(segs) {
  let html = '';
  let prevChip = true; // սկզբում և երկու չիպի միջև՝ դատարկ տեքստային հանգույց (ZW)
  for (const s of segs) {
    if (s.tok) {
      if (prevChip) html += ZW;
      html += `<span contenteditable="false" data-tok="${esc(s.tok)}" class="xt xt-${s.info.color || 'default'}">${esc(s.tok)}</span>`;
      prevChip = true;
    } else {
      html += esc(s.text);
      prevChip = false;
    }
  }
  if (prevChip) html += ZW;
  return html;
}

const nodeLen = (n) => (n.nodeType === 3 ? n.textContent.replace(/​/g, '').length : n.dataset?.tok ? n.dataset.tok.length : n.textContent.replace(/​/g, '').length);

function serialize(root) {
  let s = '';
  for (const n of root.childNodes) {
    if (n.nodeType === 3) s += n.textContent;
    else if (n.dataset?.tok) s += n.dataset.tok;
    else if (n.nodeName === 'BR') s += ' ';
    else s += ` ${serialize(n)}`;
  }
  return s.replace(/​/g, '').replace(/ /g, ' ');
}

/** Կուրսորի դիրքը արժեքի տողում (չիպը հաշվվում է իր երկարությամբ) */
function getCaret(root) {
  const sel = window.getSelection();
  if (!sel.rangeCount || !root.contains(sel.anchorNode)) return null;
  const { startContainer: c, startOffset: o } = sel.getRangeAt(0);
  let pos = 0;
  if (c === root) {
    for (let i = 0; i < o; i++) pos += nodeLen(root.childNodes[i]);
    return pos;
  }
  for (const n of root.childNodes) {
    if (n === c || n.contains(c)) {
      if (n.nodeType === 3) return pos + n.textContent.slice(0, o).replace(/​/g, '').length;
      return pos + nodeLen(n);
    }
    pos += nodeLen(n);
  }
  return pos;
}

function setCaret(root, pos) {
  const sel = window.getSelection();
  const range = document.createRange();
  let rest = pos;
  for (const n of root.childNodes) {
    const len = nodeLen(n);
    if (n.nodeType === 3) {
      if (rest <= len) {
        // մաքուր դիրքը → իրական դիրք (ZW-ները բաց թողնելով)
        let raw = 0;
        let clean = 0;
        while (raw < n.textContent.length && (clean < rest || n.textContent[raw] === ZW)) { if (n.textContent[raw] !== ZW) clean++; raw++; }
        range.setStart(n, raw);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
    } else if (rest < len) {
      range.setStartBefore(n);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    rest -= len;
  }
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

const ExpressionEditor = forwardRef(function ExpressionEditor({ value, onChange, describe, label, error, helperText, disabled }, ref) {
  const el = useRef(null);
  const emitted = useRef(null);
  const caret = useRef(null); // վերջին հայտնի դիրքը (վահանակից տեղադրման համար)
  const composing = useRef(false);
  const [hover, setHover] = useState(null);

  const render = (v, caretPos) => {
    const root = el.current;
    if (!root) return;
    root.innerHTML = toHtml(segments(v, describe));
    if (caretPos !== null && caretPos !== undefined && document.activeElement === root) setCaret(root, caretPos);
  };

  const emit = (v, caretPos) => {
    emitted.current = v;
    caret.current = caretPos;
    render(v, caretPos);
    onChange(v);
  };

  // Արտաքին փոփոխություն (վահանակ, օրինակ, ուղղության փոփոխություն) կամ բաղադրիչների ցանկի փոփոխություն
  const known = segments(value, describe).filter((s) => s.tok).map((s) => s.tok).join('|');
  useLayoutEffect(() => {
    if (value !== emitted.current || el.current.dataset.known !== known) {
      emitted.current = value;
      el.current.dataset.known = known;
      render(value, document.activeElement === el.current ? getCaret(el.current) : null);
    }
  });

  useImperativeHandle(ref, () => ({
    /** Տեղադրում է բաղադրիչը կուրսորի վերջին դիրքում (լռելյայն՝ վերջում) */
    insert(tok) {
      const v = emitted.current ?? value;
      const at = caret.current ?? v.length;
      const before = v.slice(0, at);
      const after = v.slice(at);
      const pre = before && !/\s$/.test(before) ? ' ' : '';
      const post = after && !/^\s/.test(after) ? ' ' : '';
      const next = `${before}${pre}${tok}${post}${after}`;
      const pos = (before + pre + tok).length;
      el.current.focus();
      emit(next, pos);
    },
  }));

  const onInput = () => {
    if (composing.current) return;
    const root = el.current;
    const pos = getCaret(root);
    emit(serialize(root), pos);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); return; }
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const sel = window.getSelection();
    if (!sel.isCollapsed) return;
    const pos = getCaret(el.current);
    if (pos === null) return;
    const v = emitted.current ?? value;
    const segs = segments(v, describe);
    // չիպը, որը կուրսորից անմիջապես առաջ (Backspace) կամ հետո (Delete) է
    const hit = segs.find((s) => s.tok && (e.key === 'Backspace' ? s.end === pos : s.start === pos));
    if (!hit) return;
    e.preventDefault();
    let start = hit.start;
    let end = hit.end;
    if (v[end] === ' ' && (start === 0 || v[start - 1] === ' ')) end++; // ավելորդ բացատ չթողնել
    emit(v.slice(0, start) + v.slice(end), start);
  };

  const onPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  };

  const rememberCaret = () => { const p = el.current && getCaret(el.current); if (p !== null && p !== undefined) caret.current = p; };

  return (
    <Box>
      {label && <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>}
      <Box
        ref={el}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        spellCheck={false}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onKeyUp={rememberCaret}
        onMouseUp={rememberCaret}
        onBlur={rememberCaret}
        onPaste={onPaste}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; onInput(); }}
        onMouseOver={(e) => { const t = e.target.closest?.('[data-tok]'); setHover(t ? { el: t, info: describe(t.dataset.tok) } : null); }}
        onMouseLeave={() => setHover(null)}
        sx={(theme) => {
          const chip = (c) => ({ borderColor: c === 'default' ? theme.palette.divider : theme.palette[c].main, color: c === 'default' ? theme.palette.text.primary : theme.palette[c].main });
          return {
            minHeight: 88, p: '10px 14px', borderRadius: 1, border: 1, borderColor: error ? 'error.main' : 'divider',
            fontFamily: 'monospace', fontSize: 15, lineHeight: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', outline: 'none', cursor: 'text',
            bgcolor: disabled ? 'action.hover' : 'background.paper',
            '&:hover': { borderColor: error ? 'error.main' : 'text.primary' },
            '&:focus': { borderColor: error ? 'error.main' : 'primary.main', boxShadow: (t) => `inset 0 0 0 1px ${error ? t.palette.error.main : t.palette.primary.main}` },
            '& .xt': { display: 'inline-block', border: '1px solid', borderRadius: '12px', px: 1, lineHeight: '22px', fontSize: 13, mx: '1px', cursor: 'default', userSelect: 'none', verticalAlign: 'baseline' },
            '& .xt:hover': { bgcolor: 'action.hover' },
            '& .xt-default': chip('default'), '& .xt-info': chip('info'), '& .xt-secondary': chip('secondary'), '& .xt-error': chip('error'),
          };
        }}
      />
      {helperText && <FormHelperText error={!!error} sx={{ mx: 1.75 }}>{helperText}</FormHelperText>}
      <Popper open={!!hover} anchorEl={hover?.el} placement="top" sx={{ zIndex: 1500, pointerEvents: 'none' }}>
        {hover && (
          <Paper elevation={4} sx={{ px: 1.25, py: 0.75, mb: 0.5, maxWidth: 360 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{hover.info?.label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{hover.el.dataset.tok}</Typography>
          </Paper>
        )}
      </Popper>
    </Box>
  );
});

export default ExpressionEditor;
