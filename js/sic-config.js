/* Owner deployment fills bugReportEndpoint only after gas/SETUP.md is done.
   Leave verified false until a real response {ok:true,id} has been read back. */
window.SIC_CONFIG = {
  appVersion: '1.1.0',
  /* Receiver stays off until gas/SETUP.md is deployed and a real ack is read. */
  bugReportEnabled: false,
  bugReportEndpoint: '',
  bugReportVerified: false
};
