# X5GON Processing Pipelines
![Node][programming-language]
![Node.js CI][github-action]
[![Linux Build][linux-build]][linux-build-status]
[![OSX Build][osx-build]][osx-build-status]
[![License][license]][license-link]

This project contains the code base for OER material processing pipeline. The
pipeline is created using qtopology which is a distributed stream processing layer.

For the full documentation check the projects [wiki pages](https://github.com/X5GON/processing-pipeline-api/wiki).


![preprocessing pipeline](./readme/kafka-pipeline.png)
*Figure 1:* The material processing pipeline architecture. It shows how we acquire
materials via different APIs and send them to the appropriate pipeline based on the
material's type.


## Prerequisites

- Node.JS version 10 or greater
- PostgreSQL version 10 or greater
- Docker v18 or higher, docker-compose v1.23 or higher

### Textract

The pipeline uses a nodejs module called [textract](./pkgs/textract) which allows
text extraction of most of text files. For some file types additional libraries need to be installed:

- **PDF** extraction requires `pdftotext` be installed, [link](http://www.xpdfreader.com/download.html).
- **DOC** extraction requires `antiword` be installed, [link](http://www.winfield.demon.nl/), unless on OSX
    in which case textutil (installed by default) is used.

## Installation

- Create and configure `.env` file in the [/env](./env) folder (see [instructions](./env/)).
- Start the docker images (see [instructions](./docker/)).
- Install the nodejs dependencies: 

    ```bash
    npm install
    ```
    
- Build the project components: 

  ```bash
  npm run build
  ```
  
  The built components will be available in the `./dist` folder.

## Folder Structure

The folder structure is as follows:

| folder name | description |
| ----------- | ----------- |
| docker      | Contains the instructions on how to start Apache Kafka Docker image                          |
| env         | Contains the instructions on how to create the environment variables for the project         |
| schemas     | Contains the schemas used to validate the material structure                                 |
| src         | Contains the topology components and configurations                                          |
| topologies  | Contains the topologies that define how the pipelines are structured together                |


## Running the individual pipelines manually

To run an individual pipeline one must run the following command:

```bash
cd ./dist && node pipeline --tn {user-defined-topology} --tp {relative-path-to-the-topology}
```

where the `user-defined-topology-name` is the name of the topology (can be anything) and
the `relative-path-to-the-topology` is the relative path to the topology. If one would like 
to run a topology in the `./topology` folder, then the relative path would be 
`../topology/{name-of-the-file}`.

The list of available topologies is found [here](https://github.com/X5GON/processing-pipeline-api/wiki/Component:-Topologies).


## Running the pipelines using PM2

While the manual start of the pipeline allows the user to run each pipeline individually,
one can also run multiple pipelines at the same time using [PM2](https://pm2.keymetrics.io/).

To install PM2 one must run

```bash
npm install -g pm2
```

Multiple configuration files `./ecosystem.config.*.yml` were prepared to run the pipelines
together and can be run with the following command:

```bash
pm2 start {ecosystem-config-name} [--env production]
```

This will also run the pipelines in the background. To control the pm2 services please see
their [documentation](https://pm2.keymetrics.io/docs/usage/quick-start/).

## Processing pipelines

The processing pipelines accept Open Educational Materials of a particular *type*
and process it accordingly. The two types that are currently supported are:

- text
- video/audio


### Pipeline components

Each pipeline contains the following components:

- **Format.** Formats the acquired materials into a common schema.
- **Content Extraction.** Extracts the content from the material. This is done
    based on the material type:
    - **Text.** We use *textract*, a Nodejs library that is able to extract raw
        text from the text material. We process *pdf, doc, docx, ppt, pptx*
        files separately - if we are not able to retrieve the content from the file
        we assume they are scans and use OCR to retrieve the text. In addition, we
        translate the text via *Transcription and Translation Platform* ([TTP](https://ttp.mllp.upv.es/index.php?page=faq)).
    - **Video/Audio.** We use the *Transcription and Translation Platform* ([TTP](https://ttp.mllp.upv.es/index.php?page=faq))
        which automatically generates transcriptions (subtitles) and translates
        the video content.

- **Content Enrichment.** Enriches the content by extracting additional features
    from the material.
    - **Wikification.** We use [wikifier](http://wikifier.org/), an online service for extracting
        wikipedia concepts associated with the provided text.

- **Validation.** Validates if the material object contains all of the required values.

- **Material Storing.** Stores the material in the appropriate database. If there
    were any errors during thisprocess, we store the error and the material in a
    different table for future exploration.

Components of the pipeline are stored in the [./src/components](./src/components/) folder and
documented in the [project wiki](https://github.com/X5GON/processing-pipeline-api/wiki/Component:-Bolts).


## Retrievers

The retrievers are responsible for retrieving materials from OER providers that
are registered in the X5GON Network. For each provider we need to develop its
own retriever, custom for their API. 

The retrievers are found in [./src/retrievers](./src/retrievers).

The currenlty available retrievers are for the following OER providers:

- [Videolectures.NET](http://videolectures.net/)


[programming-language]: https://img.shields.io/badge/node-%3E%3D%2010.0.0-green.svg
[github-action]: https://github.com/X5GON/search-api/workflows/Node.js%20CI/badge.svg
[linux-build]: https://img.shields.io/travis/X5GON/processing-pipeline-api/master.svg?label=linux
[linux-build-status]: https://travis-ci.org/X5GON/processing-pipeline-api
[osx-build]: https://img.shields.io/travis/X5GON/processing-pipeline-api/master.svg?label=mac
[osx-build-status]: https://travis-ci.org/X5GON/processing-pipeline-api
[license]: https://img.shields.io/badge/License-BSD%202--Clause-green.svg
[license-link]: https://opensource.org/licenses/BSD-2-Clause
