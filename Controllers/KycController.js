const Kyc = require('../Models/Kyc');
const User = require('../Models/Users');
const { notifyUser } = require('../Services/notificationService');

const getUserId = (req) => req.user?.id || req.user?._id;

exports.submitKyc = async (req, res) => {
  try {
    if (!['Mother', 'Babysitter'].includes(req.user.role)) {
      return res.status(403).json({ message: 'KYC is available only for mothers and babysitters.' });
    }
    const { address, emergencyContactName, emergencyContactPhone } = req.body;
    if (!address || !emergencyContactName || !emergencyContactPhone || !req.files?.proofOfAddress?.[0] || !req.files?.identityCard?.[0]) {
      return res.status(400).json({ message: 'Address, emergency contact, proof of address and identity card are required.' });
    }

    const kyc = await Kyc.findOneAndUpdate(
      { user: getUserId(req) },
      {
        user: getUserId(req),
        address,
        emergencyContactName,
        emergencyContactPhone,
        proofOfAddressUrl: req.files.proofOfAddress[0].path,
        identityCardUrl: req.files.identityCard[0].path,
        status: 'pending',
        rejectionReason: '',
        reviewedBy: null,
        reviewedAt: null,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({ message: 'KYC submitted for admin review.', kyc });
  } catch (error) {
    console.error('submitKyc error:', error);
    return res.status(500).json({ message: 'Error submitting KYC.', error: error.message });
  }
};

exports.getMyKyc = async (req, res) => {
  try {
    const kyc = await Kyc.findOne({ user: getUserId(req) }).populate('reviewedBy', 'FirstName LastName Email');
    return res.status(200).json({ kyc });
  } catch (error) {
    console.error('getMyKyc error:', error);
    return res.status(500).json({ message: 'Error fetching KYC.', error: error.message });
  }
};

exports.getKycApplications = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const applications = await Kyc.find(filter)
      .populate('user', '-Password -resetPasswordToken -resetPasswordExpires -pushTokens -stripeAccountId')
      .populate('reviewedBy', 'FirstName LastName Email')
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: applications.length, applications });
  } catch (error) {
    console.error('getKycApplications error:', error);
    return res.status(500).json({ message: 'Error fetching KYC applications.', error: error.message });
  }
};

exports.reviewKyc = async (req, res) => {
  try {
    const { status, rejectionReason = '' } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'KYC status must be approved or rejected.' });
    }
    if (status === 'rejected' && !rejectionReason.trim()) {
      return res.status(400).json({ message: 'rejectionReason is required when rejecting KYC.' });
    }

    const kyc = await Kyc.findByIdAndUpdate(req.params.id, {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : '',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    }, { new: true }).populate('user', 'FirstName LastName Email role');
    if (!kyc) return res.status(404).json({ message: 'KYC application not found.' });

    notifyUser({
      userId: kyc.user._id,
      type: `kyc.${status}`,
      title: `KYC ${status}`,
      message: status === 'approved' ? 'Your identity verification was approved.' : `Your identity verification was rejected: ${rejectionReason}`,
      data: { kycId: kyc._id.toString(), action: 'view_kyc' },
    }).catch((error) => console.error('KYC notification error:', error.message));

    return res.status(200).json({ message: `KYC ${status}.`, kyc });
  } catch (error) {
    console.error('reviewKyc error:', error);
    return res.status(500).json({ message: 'Error reviewing KYC.', error: error.message });
  }
};
