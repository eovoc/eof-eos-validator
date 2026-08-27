package edu.uoc.som.jsonschematouml.cli;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStream;

import org.eclipse.uml2.uml.Model;

import edu.uoc.som.jsonschematouml.generators.JSONSchemaToUML;
import edu.uoc.som.jsonschematouml.generators.JSONSchemaToUMLException;

import net.sourceforge.plantuml.FileFormat;
import net.sourceforge.plantuml.FileFormatOption;
import net.sourceforge.plantuml.SourceStringReader;

/**
 * Headless CLI entry point for the JSONSchema-to-UML generator (see
 * https://github.com/SOM-Research/jsonSchema-to-uml). Generates a UML2/XMI model and renders a
 * class-diagram (PlantUML source + PNG/SVG) from a JSON Schema file or folder, without needing
 * Eclipse or Papyrus.
 */
public class Main {

	public static void main(String[] args) {
		if (args.length < 2) {
			System.err.println("Usage: jsonschema-to-uml <input.json|input-folder> <output-dir> [model-name]");
			System.exit(2);
		}

		File input = new File(args[0]);
		File outputDir = new File(args[1]);
		String modelName = args.length >= 3 ? args[2] : baseName(input);

		if (!input.exists()) {
			System.err.println("Input not found: " + input.getAbsolutePath());
			System.exit(1);
		}
		outputDir.mkdirs();

		try {
			JSONSchemaToUML generator = new JSONSchemaToUML(modelName);
			generator.launch(input);

			File umlFile = new File(outputDir, modelName + ".uml");
			generator.saveModel(umlFile);
			System.out.println("Wrote " + umlFile.getAbsolutePath());

			Model model = generator.getModel();
			String puml = Uml2PlantUml.export(model);
			File pumlFile = new File(outputDir, modelName + ".puml");
			try (FileWriter w = new FileWriter(pumlFile)) {
				w.write(puml);
			}
			System.out.println("Wrote " + pumlFile.getAbsolutePath());

			render(puml, new File(outputDir, modelName + ".png"), FileFormat.PNG);
			render(puml, new File(outputDir, modelName + ".svg"), FileFormat.SVG);
		} catch (JSONSchemaToUMLException e) {
			System.err.println("Generation failed: " + e.getMessage());
			System.exit(1);
		} catch (IOException e) {
			System.err.println("I/O error: " + e.getMessage());
			System.exit(1);
		}
	}

	private static void render(String puml, File target, FileFormat format) throws IOException {
		SourceStringReader reader = new SourceStringReader(puml);
		try (OutputStream out = new FileOutputStream(target)) {
			reader.outputImage(out, new FileFormatOption(format));
		}
		System.out.println("Wrote " + target.getAbsolutePath());
	}

	private static String baseName(File f) {
		String name = f.getName();
		int dot = name.lastIndexOf('.');
		return dot > 0 ? name.substring(0, dot) : name;
	}
}
