-- CreateIndex
CREATE INDEX "aircraft_manufacturer_idx" ON "public"."aircraft"("manufacturer");

-- CreateIndex
CREATE INDEX "aircraft_model_idx" ON "public"."aircraft"("model");

-- CreateIndex
CREATE INDEX "aircraft_year_idx" ON "public"."aircraft"("year");

-- CreateIndex
CREATE INDEX "aircraft_price_idx" ON "public"."aircraft"("price");

-- CreateIndex
CREATE INDEX "aircraft_location_idx" ON "public"."aircraft"("location");

-- CreateIndex
CREATE INDEX "aircraft_status_idx" ON "public"."aircraft"("status");

-- CreateIndex
CREATE INDEX "aircraft_forSale_idx" ON "public"."aircraft"("forSale");

-- CreateIndex
CREATE INDEX "aircraft_registration_idx" ON "public"."aircraft"("registration");

-- CreateIndex
CREATE INDEX "aircraft_serialNumber_idx" ON "public"."aircraft"("serialNumber");

-- CreateIndex
CREATE INDEX "aircraft_createdAt_idx" ON "public"."aircraft"("createdAt");

-- CreateIndex
CREATE INDEX "aircraft_manufacturer_model_idx" ON "public"."aircraft"("manufacturer", "model");

-- CreateIndex
CREATE INDEX "aircraft_year_price_idx" ON "public"."aircraft"("year", "price");

-- CreateIndex
CREATE INDEX "aircraft_status_forSale_idx" ON "public"."aircraft"("status", "forSale");
