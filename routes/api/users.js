const express = require('express');

const { ethers } = require('ethers');

const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const normalize = require('normalize-url');

const User = require('../../models/User');

const ABI = require('../../abi/ERC20.json');

// @route    POST api/users
// @desc     Register user
// @access   Public

const contractAddress = "0xD48DBacCe05c0f5322B921CC49cB7d2F4915ff3B";

router.get('/getbalance', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Please provide wallet address' });
    }

    if(!ethers.utils.isAddress(walletAddress)){
      return res.status(400).json({ error: 'Please provide valid wallet address' });
    }

    let url = "https://sepolia.infura.io/v3/64d5a638c6834dddb6a59aa830e93f09"; //Sepolia rpc url
    let customHttpProvider = new ethers.providers.JsonRpcProvider(url);

    const testTokenContract = new ethers.Contract(contractAddress, ABI, customHttpProvider);
    
    const balance = await testTokenContract.balanceOf(walletAddress);
    const tokenBalance = ethers.utils.formatEther(balance);
    
    res.status(200).json({ success: true, walletAddress: walletAddress, balance: `${tokenBalance.toString()} TEST` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', check('name', 'Name is required').notEmpty(), check('email', 'Please include a valid email').isEmail(), check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      user = new User({
        name,
        email,
        password
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
