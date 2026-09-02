const Joi = require('joi');

const schemas = {
    auth: {
        login: Joi.object({
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email format.',
                'any.required': 'Email is required.'
            }),
            password: Joi.string().required().messages({
                'any.required': 'Password is required.'
            }),
            guestCart: Joi.array().items(
                Joi.object({
                    productId: Joi.number().integer().required(),
                    quantity: Joi.number().integer().positive().required()
                })
            ).optional()
        }),
        forgotPassword: Joi.object({
            email: Joi.string().email().required().messages({
                'any.required': 'Email is required.'
            })
        }),
        resetPassword: Joi.object({
            newPassword: Joi.string().min(6).required().messages({
                'any.required': 'New password is required.',
                'string.min': 'Password must be at least 6 characters long.'
            })
        }),
        resetPasswordParams: Joi.object({
            token: Joi.string().required().messages({
                'any.required': 'Token is required.'
            })
        })
    },
    order: {
        placeOrder: Joi.object({
            shippingAddress: Joi.string().required().messages({
                'any.required': 'Shipping address is required'
            }),
            paymentMethod: Joi.string().required().messages({
                'any.required': 'Payment method is required'
            }),
            items: Joi.array().items(
                Joi.object({
                    productId: Joi.number().integer().required().messages({
                        'any.required': 'Invalid product ID',
                        'number.base': 'Invalid product ID'
                    }),
                    quantity: Joi.number().integer().positive().required().messages({
                        'any.required': 'Quantity must be a positive integer',
                        'number.positive': 'Quantity must be a positive integer',
                        'number.base': 'Quantity must be a positive integer'
                    })
                })
            ).min(1).required().messages({
                'any.required': 'Order items cannot be empty',
                'array.min': 'Order items cannot be empty'
            })
        })
    },
    user: {
        registration: Joi.object({
            email: Joi.string().email().required().messages({
                'string.empty': "A valid email is required",
                'string.email': "A valid email is required",
                'any.required': "A valid email is required"
            }),
            password: Joi.string().min(6).required().messages({
                'string.empty': "Password must be at least 6 characters long",
                'string.min': "Password must be at least 6 characters long",
                'any.required': "Password must be at least 6 characters long"
            })
        }).unknown(true),
        update: Joi.object({
            email: Joi.string().email().optional().messages({
                'string.email': "A valid email is required"
            }),
            password: Joi.string().min(6).optional().messages({
                'string.min': "Password must be at least 6 characters long"
            }),
            phone: Joi.string().min(10).optional().messages({
                'string.min': "Phone must be at least 10 characters long"
            })
        }).unknown(true)
    },
    product: {
        create: Joi.object({
            name: Joi.string().required(),
            description: Joi.string().optional().allow(''),
            price: Joi.number().positive().required(),
            stock: Joi.number().integer().min(0).required(),
            subcategoryId: Joi.number().integer().required(),
            status: Joi.string().valid('Pending', 'Active').optional(),
            sellerId: Joi.number().integer().optional()
        }),
        update: Joi.object({
            name: Joi.string().optional(),
            description: Joi.string().optional().allow(''),
            price: Joi.number().positive().optional(),
            stock: Joi.number().integer().min(0).optional(),
            subcategoryId: Joi.number().integer().optional(),
            status: Joi.string().valid('Pending', 'Active').optional(),
            sellerId: Joi.number().integer().optional()
        })
    }
};

const validateRequest = (schemaKey, property = 'body') => {
    return (req, res, next) => {
        const [group, key] = schemaKey.split('.');
        const schema = schemas[group]?.[key];

        if (!schema) {
            console.error(`Validation schema '${schemaKey}' not found.`);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });

        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({ message: errorMessage });
        }

        // Replace req data with validated & sanitized data
        req[property] = value;
        next();
    };
};

module.exports = {
    validateRequest,
    schemas
};
