window.__ModuleLoader__.load({
  id: 'dsh-token-meter',
  factory(require) {
    const React = require('react')
    // `react-dom` is a platform-baseline module, not a Harness package: the
    // header clips its overflow, so the popover must be portalled to the body.
    const { createPortal } = require('react-dom')
    const h = React.createElement

    const ROUTE = 'token-meter/summary'
    const NS = 'token-meter'
    const REFRESH_MS = 15000

    const EN = {
      title: 'Token counter',
      'count.total': 'Total tokens',
      'count.input': 'Input',
      'count.output': 'Output',
      'count.cache': 'Cache',
      'count.calls': 'Model calls',
      'count.sessions': 'Sessions',
      'panel.subtitle': 'Every token recorded across this profile\u2019s sessions',
      'chip.title': 'Total tokens used across all sessions',
      'chip.models': 'Top models by tokens',
      'chip.more': 'Open the full counter',
      'panel.refresh': 'Refresh',
      'panel.refreshing': 'Reading session logs\u2026',
      'panel.empty': 'No usage recorded yet. Token counts appear here after the first model call.',
      'panel.error': 'Could not read session usage.',
      'panel.retry': 'Try again',
      'panel.byModel': 'By model',
      'panel.bySession': 'Top sessions',
      'panel.unknownModel': 'Unknown model',
      'panel.truncated': 'Showing the {count} most recent sessions.',
      'panel.counting': 'Counting session logs\u2026 {count} done so far.',
      'panel.note': 'Counted from provider-reported usage in each session log; forked history is not double-counted.',
      'panel.token': 'tokens',
    }

    const AR = {
      title: '\u0639\u062f\u0627\u062f \u0627\u0644\u062a\u0648\u0643\u0646\u0627\u062a',
      'count.total': '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0648\u0643\u0646\u0627\u062a',
      'count.input': '\u0627\u0644\u0625\u062f\u062e\u0627\u0644',
      'count.output': '\u0627\u0644\u0625\u062e\u0631\u0627\u062c',
      'count.cache': '\u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0645\u0624\u0642\u062a',
      'count.calls': '\u0627\u0633\u062a\u062f\u0639\u0627\u0621\u0627\u062a \u0627\u0644\u0646\u0645\u0648\u0630\u062c',
      'count.sessions': '\u0627\u0644\u062c\u0644\u0633\u0627\u062a',
      'chip.title': '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0648\u0643\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0641\u064a \u0643\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a',
      'chip.models': '\u0623\u0639\u0644\u0649 \u0627\u0644\u0646\u0645\u0627\u0630\u062c \u0627\u0633\u062a\u0647\u0644\u0627\u0643\u064b\u0627',
      'chip.more': '\u0641\u062a\u062d \u0627\u0644\u0639\u062f\u0627\u062f \u0627\u0644\u0643\u0627\u0645\u0644',
      'panel.subtitle': '\u0643\u0644 \u062a\u0648\u0643\u0646 \u0645\u0633\u062c\u064e\u0651\u0644 \u0641\u064a \u062c\u0644\u0633\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a',
      'panel.refresh': '\u062a\u062d\u062f\u064a\u062b',
      'panel.refreshing': '\u062c\u0627\u0631\u064d \u0642\u0631\u0627\u0621\u0629 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u062c\u0644\u0633\u0627\u062a\u2026',
      'panel.empty': '\u0644\u0627 \u064a\u0648\u062c\u062f \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0645\u0633\u062c\u064e\u0651\u0644 \u0628\u0639\u062f. \u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0623\u0639\u062f\u0627\u062f \u0628\u0639\u062f \u0623\u0648\u0644 \u0627\u0633\u062a\u062f\u0639\u0627\u0621 \u0644\u0644\u0646\u0645\u0648\u0630\u062c.',
      'panel.error': '\u062a\u0639\u0630\u064e\u0651\u0631\u062a \u0642\u0631\u0627\u0621\u0629 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062c\u0644\u0633\u0627\u062a.',
      'panel.retry': '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629',
      'panel.byModel': '\u062d\u0633\u0628 \u0627\u0644\u0646\u0645\u0648\u0630\u062c',
      'panel.bySession': '\u0623\u0643\u062b\u0631 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u064b\u0627',
      'panel.unknownModel': '\u0646\u0645\u0648\u0630\u062c \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641',
      'panel.truncated': '\u064a\u062a\u0645 \u0639\u0631\u0636 \u0623\u062d\u062f\u062b {count} \u062c\u0644\u0633\u0629.',
      'panel.counting': '\u062c\u0627\u0631\u064d \u0639\u062f\u0651 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u062c\u0644\u0633\u0627\u062a\u2026 \u062a\u0645 \u0625\u062a\u0645\u0627\u0645 {count}.',
      'panel.note': '\u062a\u064f\u062d\u062a\u0633\u0628 \u0645\u0646 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0630\u064a \u064a\u0628\u0644\u0651\u063a \u0639\u0646\u0647 \u0627\u0644\u0645\u0632\u0648\u0651\u062f \u0641\u064a \u0633\u062c\u0644 \u0643\u0644 \u062c\u0644\u0633\u0629\u060c \u062f\u0648\u0646 \u0627\u062d\u062a\u0633\u0627\u0628 \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0645\u0646\u0633\u0648\u062e \u0645\u0631\u062a\u064a\u0646.',
      'panel.token': '\u062a\u0648\u0643\u0646',
    }

    /** Compact a token count: 1.2M, 34.5K, 812. */
    function compact(value) {
      const n = Number(value) || 0
      if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`
      if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
      if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`
      return String(n)
    }

    /** Full number with thousands separators. */
    function exact(value) {
      return (Number(value) || 0).toLocaleString()
    }

    const styles = {
      root: {
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        padding: '28px 32px 40px',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
      },
      header: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      },
      titles: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
      title: { fontSize: '20px', fontWeight: 600, lineHeight: '26px', margin: 0 },
      subtitle: {
        fontSize: '13px',
        color: 'var(--dsw-alias-label-secondary)',
        lineHeight: '18px',
        margin: 0,
      },
      button: {
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '30px',
        padding: '0 12px',
        borderRadius: '8px',
        border: '0.5px solid var(--dsw-alias-border-l3, var(--dsw-alias-border-l2))',
        background: 'var(--dsw-alias-button-elevated-fill, transparent)',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        fontSize: '13px',
        cursor: 'pointer',
        flex: 'none',
      },
      hero: {
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '22px 24px',
        borderRadius: '14px',
        border: '0.5px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      heroLabel: {
        fontSize: '12px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--dsw-alias-label-secondary)',
      },
      heroValue: {
        fontSize: '44px',
        fontWeight: 650,
        lineHeight: '50px',
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      },
      heroExact: {
        fontSize: '13px',
        color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
      },
      card: {
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '14px 16px',
        borderRadius: '12px',
        border: '0.5px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      cardLabel: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' },
      cardValue: {
        fontSize: '20px',
        fontWeight: 600,
        lineHeight: '24px',
        fontVariantNumeric: 'tabular-nums',
      },
      section: { display: 'flex', flexDirection: 'column', gap: '10px' },
      sectionTitle: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--dsw-alias-label-secondary)',
        letterSpacing: '0.02em',
        margin: 0,
      },
      row: {
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '0.5px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      rowName: {
        flex: 1,
        minWidth: 0,
        fontSize: '13px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      rowMeta: {
        flex: 'none',
        fontSize: '12px',
        color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      rowValue: {
        flex: 'none',
        minWidth: '74px',
        textAlign: 'right',
        fontSize: '13px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      },
      bar: {
        flex: 'none',
        width: '84px',
        height: '4px',
        borderRadius: '2px',
        background: 'var(--dsw-alias-border-l1)',
        overflow: 'hidden',
      },
      barFill: {
        height: '100%',
        borderRadius: '2px',
        background: 'var(--dsw-alias-brand-primary)',
      },
      note: {
        fontSize: '12px',
        lineHeight: '18px',
        color: 'var(--dsw-alias-label-secondary)',
        margin: 0,
      },
      state: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '180px',
        fontSize: '13px',
        color: 'var(--dsw-alias-label-secondary)',
      },
      error: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        minHeight: '180px',
        justifyContent: 'center',
        fontSize: '13px',
        color: 'var(--dsw-alias-state-error-primary)',
      },
      // The header pill sits beside the shipped 24px utility controls.
      chip: {
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '24px',
        padding: '0 8px',
        borderRadius: '9px',
        border: '0.5px solid var(--dsw-alias-border-l3, var(--dsw-alias-border-l2))',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'inherit',
        fontSize: '12px',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        flex: 'none',
      },
      chipDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'var(--dsw-alias-brand-primary)',
        flex: 'none',
      },
      chipWrap: { display: 'inline-flex', flex: 'none' },
      popover: {
        position: 'fixed',
        zIndex: 2147483000,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px',
        borderRadius: '12px',
        border: '0.5px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-overlay)',
        color: 'var(--dsw-alias-label-primary)',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.28)',
      },
      popoverTitle: {
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: 'var(--dsw-alias-label-secondary)',
      },
      popoverRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
      popoverRowHead: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '10px',
      },
      popoverName: {
        minWidth: 0,
        fontSize: '13px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      popoverValue: {
        flex: 'none',
        fontSize: '13px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      },
      popoverBar: {
        display: 'block',
        width: '100%',
        height: '4px',
        borderRadius: '2px',
        background: 'var(--dsw-alias-border-l1)',
        overflow: 'hidden',
      },
      popoverMeta: {
        fontSize: '11px',
        color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      popoverMore: {
        boxSizing: 'border-box',
        width: '100%',
        height: '28px',
        marginTop: '2px',
        borderRadius: '8px',
        border: '0.5px solid var(--dsw-alias-border-l2)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        fontSize: '12px',
        cursor: 'pointer',
      },
    }

    /** The sidebar entry glyph: a stack of counted tokens. */
    function TokenMeterIcon(props) {
      const size = props?.size ?? 16
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', {
          x: 2.25,
          y: 9.25,
          width: 2.6,
          height: 4.5,
          rx: 0.9,
          fill: 'currentColor',
          opacity: props?.active ? 1 : 0.75,
        }),
        h('rect', {
          x: 6.7,
          y: 6.2,
          width: 2.6,
          height: 7.55,
          rx: 0.9,
          fill: 'currentColor',
          opacity: props?.active ? 1 : 0.9,
        }),
        h('rect', {
          x: 11.15,
          y: 2.25,
          width: 2.6,
          height: 11.5,
          rx: 0.9,
          fill: 'currentColor',
        }),
      )
    }

    /** Read the Host summary. `fresh` asks the Host to revalidate every log. */
    async function readSummary(signal, fresh) {
      const response = await fetch(fresh ? `${ROUTE}?refresh=1` : ROUTE, {
        headers: { accept: 'application/json' },
        signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    /**
     * One shared reader for the header pills: concurrent polls share one request.
     *
     * No value is kept here. The Host already caches its fold, and a page-side
     * cache is what previously pinned the pill to the cold-start placeholder
     * (`calls: 0`), which hid it forever.
     */
    const summaryFeed = (() => {
      let pending
      const read = () => {
        if (pending !== undefined) return pending
        pending = readSummary(undefined, false)
          .then((value) => {
            pending = undefined
            return value
          })
          .catch((error) => {
            pending = undefined
            throw error
          })
        return pending
      }
      return { read }
    })()

    /**
     * The conversation-header pill: total tokens used, beside the shipped
     * utilities. Clicking it lists the three heaviest models.
     * @param props - Panel navigation and locale seat.
     * @returns the pill and its popover, or null until a count is known.
     */
    function TokenMeterChip(props) {
      const t = props.t
      const [data, setData] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [pos, setPos] = React.useState(null)
      const anchorRef = React.useRef(null)
      const panelRef = React.useRef(null)

      React.useEffect(() => {
        let live = true
        const pull = () => {
          summaryFeed.read().then(
            (value) => {
              if (live) setData(value)
            },
            () => {},
          )
        }
        pull()
        const id = setInterval(pull, REFRESH_MS)
        return () => {
          live = false
          clearInterval(id)
        }
      }, [])

      // Anchor the popover under the pill. Portal + measured position keeps it
      // visible: the header clips its overflow, so an in-flow panel would be cut.
      React.useEffect(() => {
        if (!open) return undefined
        const place = () => {
          const anchor = anchorRef.current
          if (anchor === null) return
          const rect = anchor.getBoundingClientRect()
          const width = 260
          const margin = 8
          const right = Math.min(
            Math.max(margin, rect.right),
            window.innerWidth - margin,
          )
          setPos({
            top: rect.bottom + 6,
            right: Math.max(margin, window.innerWidth - right),
            width,
          })
        }
        place()
        const onDown = (event) => {
          if (panelRef.current?.contains(event.target)) return
          if (anchorRef.current?.contains(event.target)) return
          setOpen(false)
        }
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        window.addEventListener('resize', place)
        window.addEventListener('scroll', place, true)
        document.addEventListener('pointerdown', onDown, true)
        document.addEventListener('keydown', onKey)
        return () => {
          window.removeEventListener('resize', place)
          window.removeEventListener('scroll', place, true)
          document.removeEventListener('pointerdown', onDown, true)
          document.removeEventListener('keydown', onKey)
        }
      }, [open])

      const totals = data?.totals
      // Nothing to say before the first fold: an empty "0" would be a lie.
      if (totals === undefined || totals.calls === 0) return null

      const top = [...(data.models ?? [])]
        .filter((row) => row.totalTokens > 0)
        .slice(0, 3)
      const max = Math.max(1, ...top.map((row) => row.totalTokens))
      const label = compact(totals.totalTokens)

      return h(
        'span',
        { ref: anchorRef, style: styles.chipWrap },
        h(
          'button',
          {
            type: 'button',
            style: styles.chip,
            title: `${t('chip.title')}: ${exact(totals.totalTokens)}`,
            'aria-label': `${t('chip.models')} — ${exact(totals.totalTokens)} ${t('panel.token')}`,
            'aria-haspopup': 'dialog',
            'aria-expanded': open,
            onClick: () => setOpen((value) => !value),
          },
          h('span', { style: styles.chipDot, 'aria-hidden': true }),
          h('span', null, label),
        ),
        open && pos !== null
          ? createPortal(
              h(
                'div',
                {
                  ref: panelRef,
                  role: 'dialog',
                  'aria-label': t('chip.models'),
                  style: {
                    ...styles.popover,
                    top: `${pos.top}px`,
                    right: `${pos.right}px`,
                    width: `${pos.width}px`,
                  },
                },
                h('div', { style: styles.popoverTitle }, t('chip.models')),
                ...top.map((row) =>
                  h(
                    'div',
                    { key: `${row.provider}/${row.model}`, style: styles.popoverRow },
                    h(
                      'div',
                      { style: styles.popoverRowHead },
                      h(
                        'span',
                        { style: styles.popoverName, title: row.model },
                        row.model === 'unknown' ? t('panel.unknownModel') : row.model,
                      ),
                      h('span', { style: styles.popoverValue }, compact(row.totalTokens)),
                    ),
                    h(
                      'span',
                      { style: styles.popoverBar },
                      h('span', {
                        style: {
                          ...styles.barFill,
                          display: 'block',
                          width: `${Math.max(3, Math.round((row.totalTokens / max) * 100))}%`,
                        },
                      }),
                    ),
                    h(
                      'span',
                      { style: styles.popoverMeta },
                      `${row.provider === 'unknown' ? t('panel.unknownModel') : row.provider} · ${exact(row.calls)} ${t('count.calls').toLowerCase()}`,
                    ),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    style: styles.popoverMore,
                    onClick: () => {
                      setOpen(false)
                      props.selectPanel('token-meter')
                    },
                  },
                  t('chip.more'),
                ),
              ),
              document.body,
            )
          : null,
      )
    }

    /** One labelled figure. */
    function Stat(props) {
      return h(
        'div',
        { style: styles.card },
        h('span', { style: styles.cardLabel }, props.label),
        h('span', { style: styles.cardValue }, props.value),
      )
    }

    /** One ranked row with a proportional bar. */
    function RankRow(props) {
      const width = `${Math.max(3, Math.round((props.value / props.max) * 100))}%`
      return h(
        'div',
        { style: styles.row },
        h('span', { style: styles.rowName, title: props.name }, props.name),
        props.meta ? h('span', { style: styles.rowMeta }, props.meta) : null,
        h('span', { style: styles.bar }, h('span', { style: { ...styles.barFill, width } })),
        h('span', { style: styles.rowValue }, `${compact(props.value)} ${props.unit}`),
      )
    }

    /** The main-column page behind the sidebar entry. */
    function TokenMeterPanel(props) {
      const t = props.t
      const [state, setState] = React.useState({ phase: 'loading', data: null, error: null })
      const abort = React.useRef(null)

      // Only an explicit Refresh revalidates every log; the interval poll is
      // cheap because the Host serves a fresh-enough fold from its cache.
      const load = React.useCallback((fresh) => {
        if (abort.current) abort.current.abort()
        const controller = new AbortController()
        abort.current = controller
        setState((previous) => ({
          phase: previous.data ? 'refreshing' : 'loading',
          data: previous.data,
          error: null,
        }))
        readSummary(controller.signal, fresh === true).then(
          (data) => {
            if (controller.signal.aborted) return
            setState({ phase: 'ready', data, error: null })
          },
          (error) => {
            if (controller.signal.aborted) return
            setState({ phase: 'error', data: null, error })
          },
        )
      }, [])

      React.useEffect(() => {
        load(true)
        return () => abort.current?.abort()
      }, [load])

      // Poll while the page is visible. A cold fold answers immediately with a
      // partial subtotal, so poll quickly until it completes, then fall back to
      // the slow cadence.
      React.useEffect(() => {
        const partial = state.data?.partial === true
        const id = setInterval(
          () => {
            if (document.visibilityState === 'visible') load(false)
          },
          partial ? 400 : REFRESH_MS,
        )
        return () => clearInterval(id)
      }, [load, state.data?.partial])

      const data = state.data
      const totals = data?.totals

      const header = h(
        'div',
        { style: styles.header },
        h(
          'div',
          { style: styles.titles },
          h('h1', { style: styles.title }, t('title')),
          h('p', { style: styles.subtitle }, t('panel.subtitle')),
        ),
        h(
          'button',
          {
            type: 'button',
            style: styles.button,
            onClick: () => load(true),
            disabled: state.phase === 'loading' || state.phase === 'refreshing',
            'aria-busy': state.phase === 'loading' || state.phase === 'refreshing',
          },
          t('panel.refresh'),
        ),
      )

      if (state.phase === 'loading') {
        return h('div', { style: styles.root }, header, h('div', { style: styles.state }, t('panel.refreshing')))
      }

      if (state.phase === 'error') {
        return h(
          'div',
          { style: styles.root },
          header,
          h(
            'div',
            { style: styles.error },
            h('span', null, `${t('panel.error')} ${state.error ? String(state.error.message ?? '') : ''}`.trim()),
            h(
              'button',
              { type: 'button', style: styles.button, onClick: () => load(true) },
              t('panel.retry'),
            ),
          ),
        )
      }

      const empty = !totals || totals.calls === 0
      if (empty) {
        // A cold fold reports `partial` until every log is decoded: show that,
        // not "no usage yet", so an empty subtotal never reads as a final zero.
        const counting = data?.partial === true
        return h(
          'div',
          { style: styles.root },
          header,
          h(
            'div',
            { style: styles.state },
            counting ? t('panel.counting').replace('{count}', exact(data.countedSessions)) : t('panel.empty'),
          ),
        )
      }

      const cacheTotal = (totals.cacheReadTokens || 0) + (totals.cacheWriteTokens || 0)
      const modelMax = Math.max(1, ...(data.models || []).map((row) => row.totalTokens))
      const sessionMax = Math.max(1, ...(data.sessions || []).map((row) => row.totalTokens))

      return h(
        'div',
        { style: styles.root },
        header,
        h(
          'div',
          { style: styles.hero },
          h('span', { style: styles.heroLabel }, t('count.total')),
          h('span', { style: styles.heroValue }, compact(totals.totalTokens)),
          h('span', { style: styles.heroExact }, `${exact(totals.totalTokens)} ${t('panel.token')}`),
        ),
        h(
          'div',
          { style: styles.grid },
          h(Stat, { label: t('count.input'), value: compact(totals.inputTokens) }),
          h(Stat, { label: t('count.output'), value: compact(totals.outputTokens) }),
          h(Stat, { label: t('count.cache'), value: compact(cacheTotal) }),
          h(Stat, { label: t('count.calls'), value: exact(totals.calls) }),
          h(Stat, { label: t('count.sessions'), value: exact(data.countedSessions) }),
        ),
        (data.models || []).length > 0 &&
          h(
            'div',
            { style: styles.section },
            h('h2', { style: styles.sectionTitle }, `${t('panel.byModel')} (${data.models.length})`),
            ...data.models.map((row) =>
              h(RankRow, {
                key: `${row.provider}/${row.model}`,
                name: row.model === 'unknown' ? t('panel.unknownModel') : row.model,
                meta: row.provider === 'unknown' ? null : row.provider,
                value: row.totalTokens,
                max: modelMax,
                unit: t('panel.token'),
              }),
            ),
          ),
        (data.sessions || []).length > 0 &&
          h(
            'div',
            { style: styles.section },
            h('h2', { style: styles.sectionTitle }, t('panel.bySession')),
            ...data.sessions.slice(0, 8).map((row) =>
              h(RankRow, {
                key: row.sessionId,
                name: row.sessionId,
                meta: exact(row.calls),
                value: row.totalTokens,
                max: sessionMax,
                unit: t('panel.token'),
              }),
            ),
          ),
        data.truncated ? h('p', { style: styles.note }, t('panel.truncated').replace('{count}', exact(data.sessionCount))) : null,
        h('p', { style: styles.note }, t('panel.note')),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        // The single-locale form: this bundle ships English and Arabic only, and
        // the two-argument form would demand every built-in locale.
        ctx.effect(
          () => {
            const offEn = ctx.locale.register(NS, 'en', EN)
            const offAr = ctx.locale.register(NS, 'ar', AR)
            return () => {
              offAr()
              offEn()
            }
          },
          'token-meter: dictionaries',
        )
        const t = ctx.locale.bind(NS)

        // The sidebar row and the main-column page share one id: selecting the
        // row dispatches the page registered under this exact key. `label` is a
        // thunk so the row follows the active locale without re-registering.
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'token-meter',
              order: 20,
              label: () => t('title'),
            },
            TokenMeterIcon,
          ),
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: 'token-meter',
              locale: NS,
            },
            TokenMeterPanel,
          ),
        )

        // The header pill: `order: -15` places it just before the shipped
        // open-in-app control (`order: -10`), so it reads as one utility cluster.
        ctx.slots.inject('conversation.session.header.utilities', () =>
          ctx.slots.register(
            {
              name: 'conversation.session.header.utilities',
              id: 'token-meter.chip',
              order: -15,
              label: () => t('title'),
              locale: NS,
              inject: () => ({
                t,
                selectPanel: (id) => ctx.layout.selectPanel(id),
              }),
            },
            TokenMeterChip,
          ),
        )
      },
    }
  },
})
