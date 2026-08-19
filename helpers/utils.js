// Helper to exclude sensitive password field from a user object
exports.sanitizeUser = (user) => {
    if (!user) return user;
    const userJson = user.toJSON ? user.toJSON() : { ...user };
    delete userJson.password;
    return userJson;
};
