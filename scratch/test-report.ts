import { reportsService } from '../lib/services/reports-service';

async function main() {
  console.log("Creating report...");
  const reportData = {
    title: "Test Report",
    description: "This is a test report",
    category: "Irregularity",
    reporter_name: "Test User",
    user_id: "test-user-id",
    station_id: "CGK",
    area: "TERMINAL"
  };

  const newReport = await reportsService.createReport(reportData);
  console.log("Created Report:", newReport.id, newReport.original_id);

  console.log("Updating report...");
  const updates = {
    description: "Updated description",
    root_caused: "Test root cause"
  };

  const updatedReport = await reportsService.updateReport(newReport.id, updates);
  console.log("Updated Report:", updatedReport?.id, updatedReport?.original_id, updatedReport?.description);

  console.log("Deleting report...");
  const deleted = await reportsService.deleteReport(newReport.id);
  console.log("Deleted:", deleted);
}

main().catch(console.error);
