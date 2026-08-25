package edu.uoc.som.jsonschematouml.cli;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.eclipse.uml2.uml.AggregationKind;
import org.eclipse.uml2.uml.Association;
import org.eclipse.uml2.uml.Class;
import org.eclipse.uml2.uml.Classifier;
import org.eclipse.uml2.uml.Enumeration;
import org.eclipse.uml2.uml.EnumerationLiteral;
import org.eclipse.uml2.uml.Element;
import org.eclipse.uml2.uml.Model;
import org.eclipse.uml2.uml.Package;
import org.eclipse.uml2.uml.PackageableElement;
import org.eclipse.uml2.uml.Property;
import org.eclipse.uml2.uml.Type;

/**
 * Walks the in-memory UML2 model produced by JSONSchemaToUML and renders it as PlantUML
 * class-diagram text. The upstream tool only knows how to save UML2/XMI (for Papyrus); this
 * gives us an image-renderable diagram without needing Papyrus/Eclipse UI.
 */
public class Uml2PlantUml {

	public static String export(Model model) {
		List<Class> classes = new ArrayList<>();
		List<Enumeration> enumerations = new ArrayList<>();
		collect(model, classes, enumerations);

		// The generator creates same-named Class/Enumeration elements as independent top-level
		// packaged elements (e.g. every polymorphic "type" enum is just called "typeEnum"). PlantUML
		// identifies nodes by name, so we disambiguate collisions here with a numeric suffix while
		// keeping a stable per-element display name for attribute/association type references.
		Map<Element, String> displayName = new HashMap<>();
		assignUniqueNames(classes, displayName);
		assignUniqueNames(enumerations, displayName);

		StringBuilder sb = new StringBuilder();
		sb.append("@startuml\n");
		sb.append("hide empty members\n");
		sb.append("skinparam classAttributeIconSize 0\n\n");

		for (Enumeration e : enumerations) {
			sb.append("enum \"").append(displayName.get(e)).append("\" {\n");
			for (EnumerationLiteral lit : e.getOwnedLiterals()) {
				sb.append("  ").append(lit.getName()).append("\n");
			}
			sb.append("}\n\n");
		}

		for (Class c : classes) {
			sb.append(c.isAbstract() ? "abstract class " : "class ").append("\"").append(displayName.get(c)).append("\"");
			sb.append(" {\n");
			for (Property attr : c.getOwnedAttributes()) {
				if (isAssociationEnd(attr)) continue;
				Type type = attr.getType();
				String typeName = type != null ? displayName.getOrDefault(type, type.getName()) : "?";
				sb.append("  ").append(attr.getName()).append(" : ").append(typeName);
				sb.append(multiplicity(attr));
				sb.append("\n");
			}
			sb.append("}\n\n");
		}

		for (Class c : classes) {
			for (Classifier sup : c.getSuperClasses()) {
				sb.append("\"").append(displayName.getOrDefault(sup, sup.getName())).append("\" <|-- \"").append(displayName.get(c)).append("\"\n");
			}
		}
		sb.append("\n");

		for (Association assoc : collectAssociations(classes)) {
			List<Property> ends = assoc.getMemberEnds();
			if (ends.size() != 2) continue;
			Property from = ends.get(0);
			Property to = ends.get(1);
			String fromName = from.getType() != null ? displayName.getOrDefault(from.getType(), from.getType().getName()) : "?";
			String toName = to.getType() != null ? displayName.getOrDefault(to.getType(), to.getType().getName()) : "?";
			String arrow = to.getAggregation() == AggregationKind.COMPOSITE_LITERAL ? "*--"
					: from.getAggregation() == AggregationKind.COMPOSITE_LITERAL ? "--*" : "-->";
			sb.append("\"").append(fromName).append("\" ").append(multiplicity(from).trim());
			sb.append(" ").append(arrow).append(" ");
			sb.append(multiplicity(to).trim()).append(" \"").append(toName).append("\"");
			if (to.getName() != null && !to.getName().isEmpty()) {
				sb.append(" : ").append(to.getName());
			}
			sb.append("\n");
		}

		sb.append("@enduml\n");
		return sb.toString();
	}

	private static void assignUniqueNames(List<? extends Element> elements, Map<Element, String> displayName) {
		Set<String> used = new HashSet<>(displayName.values());
		for (Element el : elements) {
			String base = nameOf(el);
			String candidate = base;
			int suffix = 2;
			while (used.contains(candidate)) {
				candidate = base + "_" + suffix++;
			}
			used.add(candidate);
			displayName.put(el, candidate);
		}
	}

	private static String nameOf(Element el) {
		if (el instanceof Classifier) return ((Classifier) el).getName();
		return el.toString();
	}

	private static boolean isAssociationEnd(Property attr) {
		return attr.getAssociation() != null;
	}

	private static String multiplicity(Property p) {
		int lower = p.getLower();
		int upper = p.getUpper();
		if (lower == 1 && upper == 1) return "";
		String upperStr = upper == -1 ? "*" : String.valueOf(upper);
		return " \"" + lower + ".." + upperStr + "\"";
	}

	private static List<Association> collectAssociations(List<Class> classes) {
		List<Association> result = new ArrayList<>();
		for (Class c : classes) {
			for (Association a : c.getAssociations()) {
				if (!result.contains(a)) result.add(a);
			}
		}
		return result;
	}

	private static void collect(Package pkg, List<Class> classes, List<Enumeration> enumerations) {
		for (PackageableElement pe : pkg.getPackagedElements()) {
			if (pe instanceof Class) {
				classes.add((Class) pe);
			} else if (pe instanceof Enumeration) {
				enumerations.add((Enumeration) pe);
			} else if (pe instanceof Package) {
				collect((Package) pe, classes, enumerations);
			}
		}
	}
}
