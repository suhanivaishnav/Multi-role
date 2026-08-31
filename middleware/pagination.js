const paginate = (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = req.query.offset !== undefined
        ? Math.max(0, parseInt(req.query.offset, 10))
        : (page - 1) * limit;

    req.pagination = { page, limit, offset };

    res.sendPaginated = (
        data,
        count,
        keyName = "data",
        extraParams = {}
    ) => {
        const totalPages = Math.ceil(count / limit);

        return res.status(200).json({
            ...extraParams,

            pagination: {
                totalItems: count,
                totalPages,
                currentPage: page,
                limit
            },
            [keyName]: data
        });
    };

    next();
};

module.exports = paginate;