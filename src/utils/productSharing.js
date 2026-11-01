export const getProductUrl = (productId) =>
  new URL(`/catalog/${encodeURIComponent(productId)}`, window.location.origin).href

export async function copyTextToClipboard(text) {
  let clipboardError

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (error) {
      clipboardError = error
    }
  }

  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  input.setSelectionRange(0, input.value.length)

  let copied = false
  try {
    copied = document.execCommand('copy')
  } finally {
    input.remove()
  }

  if (!copied) {
    throw clipboardError || new Error('Unable to copy the product link.')
  }
}

export async function shareProductLink(gun) {
  if (!gun.id) throw new Error('This product does not have a shareable ID.')

  const url = getProductUrl(gun.id)
  if (navigator.share) {
    try {
      await navigator.share({
        title: gun.name,
        text: `Check out ${gun.name}`,
        url,
      })
      return 'shared'
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled'
    }
  }

  await copyTextToClipboard(url)
  return 'copied'
}
