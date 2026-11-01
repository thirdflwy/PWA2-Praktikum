import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { copyTextToClipboard, getProductUrl, shareProductLink } from '../../utils/productSharing'

export default function ProductShareButton({ gun, compact = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [manualUrl, setManualUrl] = useState('')

  const copyLink = async () => {
    setStatus('')
    setManualUrl('')

    try {
      await copyTextToClipboard(getProductUrl(gun.id))
      setStatus('Link copied to clipboard!')
    } catch {
      setManualUrl(getProductUrl(gun.id))
      setStatus('Copy failed. Select and copy the link below.')
    }
  }

  const shareLink = async () => {
    setStatus('')
    setManualUrl('')

    try {
      const result = await shareProductLink(gun)
      if (result === 'copied') setStatus('Link copied to clipboard!')
      if (result === 'shared') setStatus('Link shared!')
    } catch {
      setManualUrl(getProductUrl(gun.id))
      setStatus('Sharing failed. Select and copy the link below.')
    }
  }

  return (
    <div className={`product-share${compact ? ' product-share--compact' : ''}`}>
      <button
        type="button"
        className={compact ? 'card-act-btn' : 'btn btn--outline'}
        onClick={(event) => {
          event.stopPropagation()
          setMenuOpen((open) => !open)
          setStatus('')
          setManualUrl('')
        }}
        disabled={!gun.id}
        aria-label={`Share link to ${gun.name}`}
        aria-expanded={menuOpen}
        title={gun.id ? 'Share product link' : 'Product link unavailable'}
      >
        <Share2 size={16} />
        {!compact && 'Share Link'}
      </button>

      {menuOpen && (
        <div className="product-share__menu" role="group" aria-label="Share options">
          <button type="button" className="product-share__option" onClick={copyLink}>
            <Copy size={15} /> Copy link
          </button>
          <button type="button" className="product-share__option" onClick={shareLink}>
            <Share2 size={15} /> Share via device
          </button>
          {status && (
            <span className="product-share__status" role="status">
              {status.startsWith('Link copied') && <Check size={13} />}
              {status}
            </span>
          )}
          {manualUrl && (
            <input
              className="product-share__manual-link"
              type="text"
              value={manualUrl}
              readOnly
              aria-label="Product link; select and copy"
              onFocus={(event) => event.target.select()}
            />
          )}
        </div>
      )}
    </div>
  )
}
