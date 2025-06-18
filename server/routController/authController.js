import User from "../schema/userSchema.js";
import bcrypt from "bcryptjs"
import jwtToken from "../utils/jwtToken.js";

export const SignUp = async (req, res) => {
    try {
        const { fullname, username, email, password, gender, profilepic } = req.body
        const user = await User.findOne({ username });
        if (user) return res.status(500).send({ success: false, message: "UserName Alrady Exist" })
        const emailpresent = await User.findOne({ email });
        if (emailpresent) return res.status(500).send({ success: false, message: "User Alrady Exist With this Email" })
        const hashPassword = bcrypt.hashSync(password, 10)
        const boyProfilePic = profilepic || `https://avatar.iran.liara.run/public/boy?username=${username} `
        const girlProfilePic = profilepic || `https://avatar.iran.liara.run/public/girl?username=${username}`

        const newUser = new User({
            fullname,
            username,
            email,
            password: hashPassword,
            gender,
            profilepic: gender === "male" ? boyProfilePic : girlProfilePic
        })
        if (newUser) {
            await newUser.save();
           jwtToken(newUser._id, res)
        } else {
            res.status(500).send({ success: false, message: "Inavlid User Data" })
        }
        res.status(201).send({
            _id: newUser._id,
            fullname: newUser.fullname,
            username: newUser.username,
            profilepic: newUser.profilepic,
            email: newUser.email,
        })

    } catch (error) {
        res.status(500).send({
            success: false,
            message: error
        })
        console.log(error);
    }
}

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) return res.status(500).send({ success: false, message: "Email Dosen't Exist Register" })
        const comparePassword = bcrypt.compareSync(password, user.password || "")
        if (!comparePassword) return res.status(500).send({ success: false, message: "Email Or Password dosen't Matching" })
        const token = jwtToken(user._id, res);
        console.log(token);

        res.status(200).send({
            _id: user._id,
            fullname: user.fullname,
            username: user.username,
            profilepic: user.profilepic,
            email: user.email,
            message: "Succesfully LogIn",
            token
        })
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error
        })
        console.log(error);
    }
}

export const LogOut = async (req, res) => {
    try {
        res.clearCookie('jwt', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        });
        res.status(200).send({ message: "User LogOut" })
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error
        })
        console.log(error);
    }
}