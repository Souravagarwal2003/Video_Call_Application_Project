import User from "../schema/userSchema.js";



export const getAllUsers = async (req, res) => {
    const currentUserID = req.user?._conditions?._id;
   // console.log("current user",currentUserID);
    if (!currentUserID) return res.status(401).json({ success: false, message: "Unauthorized." });
    try {
        const users = await User.find({ _id: { $ne: currentUserID } }, "profilepic email username");
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Search user by username or email
export const getUserByUsernameOrEmail = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, message: "Query is required." });

    try {
        const user = await User.findOne(
            { $or: [{ username: query }, { email: query }] },
            "fullname email username"
        );

        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get user by ID
export const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id, "fullname email username gender profilepic");
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Invalid user ID." });
    }
};