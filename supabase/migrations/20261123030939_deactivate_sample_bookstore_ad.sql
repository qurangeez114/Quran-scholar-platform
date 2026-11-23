-- The only ad on file is a test row (advertiser "Test Advertiser", test@example.com)
-- promoting a bookstore with a discount code. Mark it inactive so qh_active_ads()
-- and the ads fallback stop showing it. Reversible: set status back to 'active'.
update public.ads
   set status = 'inactive'
 where id = 'b2ec9333-7f2e-4b1c-b65d-8a9b3f4daaec'
   and status = 'active';
