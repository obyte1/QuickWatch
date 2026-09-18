const CompanySettings = require('../Models/CompanySettings');

exports.getCompanySettings = async (req, res) => {
  try {
    const settings = await CompanySettings.findOne({ key: 'default' }).lean();
    return res.status(200).json({ settings: settings || { key: 'default', extraAmountPerHour: 0, currency: 'usd' } });
  } catch (error) {
    console.error('getCompanySettings error:', error);
    return res.status(500).json({ message: 'Error fetching company settings.', error: error.message });
  }
};

exports.updateCompanySettings = async (req, res) => {
  try {
    const extraAmountPerHour = Number(req.body.extraAmountPerHour);
    if (!Number.isFinite(extraAmountPerHour) || extraAmountPerHour < 0) {
      return res.status(400).json({ message: 'extraAmountPerHour must be zero or greater.' });
    }
    const settings = await CompanySettings.findOneAndUpdate(
      { key: 'default' },
      { extraAmountPerHour, currency: req.body.currency || 'usd', updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    return res.status(200).json({ message: 'Company settings updated.', settings });
  } catch (error) {
    console.error('updateCompanySettings error:', error);
    return res.status(500).json({ message: 'Error updating company settings.', error: error.message });
  }
};
