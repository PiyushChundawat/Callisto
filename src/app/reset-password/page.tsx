import ResetForm from "./ResetForm";

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const query = await props.searchParams;
  return <ResetForm token={query.token ?? ""} />;
}