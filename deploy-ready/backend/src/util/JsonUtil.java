package util;

import model.Application;
import model.Company;
import model.Interview;
import model.Offer;

import java.util.List;
import java.util.Map;

/**
 * Lightweight, zero-dependency JSON formatting utility for WebServer.
 */
public class JsonUtil {

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    public static String companyToJson(Company c) {
        return String.format(
                "{\"companyId\":%d,\"name\":\"%s\",\"location\":\"%s\",\"roleOffered\":\"%s\",\"contactEmail\":\"%s\"}",
                c.getCompanyId(),
                escape(c.getName()),
                escape(c.getLocation()),
                escape(c.getRoleOffered()),
                escape(c.getContactEmail())
        );
    }

    public static String companiesToJson(List<Company> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            sb.append(companyToJson(list.get(i)));
            if (i < list.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    public static String applicationToJson(Application a) {
        String fDate = (a.getFollowUpDate() != null) ? a.getFollowUpDate().toString() : "";
        String aDate = (a.getAppliedDate() != null) ? a.getAppliedDate().toString() : "";
        return String.format(
                "{\"applicationId\":%d,\"companyId\":%d,\"companyName\":\"%s\",\"role\":\"%s\",\"type\":\"%s\",\"appliedDate\":\"%s\",\"status\":\"%s\",\"followUpDate\":\"%s\"}",
                a.getApplicationId(),
                a.getCompanyId(),
                escape(a.getCompanyName()),
                escape(a.getRole()),
                escape(a.getType()),
                aDate,
                escape(a.getStatus()),
                fDate
        );
    }

    public static String applicationsToJson(List<Application> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            sb.append(applicationToJson(list.get(i)));
            if (i < list.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    public static String interviewToJson(Interview iv) {
        String d = (iv.getInterviewDate() != null) ? iv.getInterviewDate().toString() : "";
        return String.format(
                "{\"interviewId\":%d,\"applicationId\":%d,\"roleAndCompany\":\"%s\",\"interviewDate\":\"%s\",\"round\":\"%s\",\"result\":\"%s\"}",
                iv.getInterviewId(),
                iv.getApplicationId(),
                escape(iv.getRoleAndCompany()),
                d,
                escape(iv.getRound()),
                escape(iv.getResult())
        );
    }

    public static String interviewsToJson(List<Interview> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            sb.append(interviewToJson(list.get(i)));
            if (i < list.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    public static String offerToJson(Offer o) {
        String d = (o.getDeadline() != null) ? o.getDeadline().toString() : "";
        return String.format(
                "{\"offerId\":%d,\"applicationId\":%d,\"roleAndCompany\":\"%s\",\"packageLpa\":%.2f,\"deadline\":\"%s\",\"offerStatus\":\"%s\"}",
                o.getOfferId(),
                o.getApplicationId(),
                escape(o.getRoleAndCompany()),
                o.getPackageLpa(),
                d,
                escape(o.getOfferStatus())
        );
    }

    public static String offersToJson(List<Offer> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            sb.append(offerToJson(list.get(i)));
            if (i < list.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    public static String mapToJson(Map<String, Long> map) {
        StringBuilder sb = new StringBuilder("{");
        int count = 0;
        for (Map.Entry<String, Long> entry : map.entrySet()) {
            sb.append("\"").append(escape(entry.getKey())).append("\":").append(entry.getValue());
            if (++count < map.size()) sb.append(",");
        }
        sb.append("}");
        return sb.toString();
    }
}
