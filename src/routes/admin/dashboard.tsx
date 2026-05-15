import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { StatusBadge, Metric, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

type Tab = "theatres" | "films" | "users" | "config" | "audit";


