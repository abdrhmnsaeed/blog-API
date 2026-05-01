const jwt = require('jsonwebtoken')
const HttpError = require('../models/errorModel');
const crypto = require('crypto');

const authMiddleware = async (req, res, next) => {
    // --- AGP TRUST BRIDGE START ---
    const agpSignature = req.headers['x-agp-signature'];
    const agpUserId = req.headers['x-agp-userid'];
    if (agpSignature && agpUserId && process.env.AGP_SECRET) {
        const hmac = crypto.createHmac('sha256', process.env.AGP_SECRET);
        hmac.update(agpUserId);
        const expectedSignature = hmac.digest('hex');
        if (agpSignature === expectedSignature) {
            req.user = { id: agpUserId };
            return next();
        }
    }
    // --- AGP TRUST BRIDGE END ---
    const Authorization = req.headers.Authorization || req.headers.authorization

    if (Authorization && Authorization.startsWith('Bearer')) {
        const token = Authorization.split(' ')[1]
        jwt.verify(token, process.env.JWT_SECRET, (err, info) => {
            if (err) return next(new HttpError('Unauthorized. Invalid token', 403))

            req.user = info
            next()
        })
    } else {
        return next(new HttpError('Unauthorized. Invalid token', 403))
    }
}

module.exports = authMiddleware;