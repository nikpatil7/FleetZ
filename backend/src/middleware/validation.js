export function validate(bodySchema) {
  return async (req, res, next) => {
    try {
      if (!bodySchema) return next()
      const value = await bodySchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
      req.body = value
      return next()
    } catch (err) {
      const details = err?.details?.map((d) => d.message) || ['Validation error']
      return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR', details })
    }
  }
}

export default validate


